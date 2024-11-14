-- Copyright (c) 2024 nataliemeow
-- 
-- This software is provided 'as-is', without any express or implied
-- warranty. In no event will the authors be held liable for any damages
-- arising from the use of this software.
-- 
-- Permission is granted to anyone to use this software for any purpose,
-- including commercial applications, and to alter it and redistribute it
-- freely, subject to the following restrictions:
-- 
-- 1. The origin of this software must not be misrepresented; you must not
--    claim that you wrote the original software. If you use this software
--    in a product, an acknowledgment in the product documentation would be
--    appreciated but is not required.
-- 2. Altered source versions must be plainly marked as such, and must not be
--    misrepresented as being the original software.
-- 3. This notice may not be removed or altered from any source distribution.

local pp = require 'metalua.pprint'
local mlc = require 'metalua.compiler'.new()

local join = table.concat

function readall(filename)
	local handle = assert(io.open(filename))
	local contents = assert(handle:read('*a'))
	handle:close()
	return contents
end

local preamble
do
	local licensedPreamble = readall('preamble.js')
	preamble = licensedPreamble:sub(licensedPreamble:find('%*/') + 2)
end

function map(list, f)
	local result = {}
	for i, v in ipairs(list) do
		result[i] = f(v, i)
	end
	return result
end

function pack(nodes)
	local js = ''
	for i, node in ipairs(nodes) do
		if i ~= 1 then js = js .. ',' end
		local tag = node.tag
		-- the two nodes that compile to tuples
		if tag == 'Call' or tag == 'Dots' or tag == 'Invoke' then
			if i == #nodes then
				js = js .. '...' .. comp(node)
			else
				js = js .. comp(node) .. '[0]'
			end
		else
			js = js .. comp(node)
		end
	end
	return js
end

function first(node)
	local tag = node.tag
	if tag == 'Call' or tag == 'Dots' or tag == 'Invoke' then
		return comp(node) .. '[0]'
	else
		return comp(node)
	end
end

function comp(node)
	local tag = node.tag

	if tag == nil then
		return join(map(node, comp), ';')
	end

	if tag == 'Id' then
		return 'l$' .. node[1]
	end

	if tag == 'Op' then
		local op = unpack(node)
		local args = {select(2, unpack(node))}
		if op == 'and' then
			return 'truth(' .. comp(args[1]) .. ')&&' .. comp(args[1])
		elseif op == 'or' then
			return 'truth(' .. comp(args[1]) .. ')||' .. comp(args[1])
		end
		return op .. '_(' .. join(map(args, comp), ',') .. ')'
	end

	if tag == 'Index' then
		local target, key = unpack(node)
		return 'index_(' .. first(target) .. ',' .. comp(key) .. ')'
	end

	if tag == 'Call' then
		local target = node[1]
		local args = {select(2, unpack(node))}
		return 'call_(' .. first(target) .. ',' .. pack(args) .. ')'
	end

	if tag == 'Invoke' then
		local target, name = unpack(node)
		local args = {select(3, unpack(node))}
		return 'method(' .. first(target) .. ',' .. comp(name) .. ',' .. pack(args) .. ')'
	end

	if tag == 'If' then
		local js = ''
		for i = 1, #node, 2 do
			local cond = node[i]
			local body = node[i + 1]
			if i ~= 1 then js = js .. 'else ' end
			js = js .. 'if(truth(' .. first(cond) .. ')){' .. comp(body) .. '}'
		end
		return js
	end

	if tag == 'While' then
		local cond, body = unpack(node)
		return 'while(truth(' .. first(cond) .. ')){' .. comp(body) .. '}'
	end

	if tag == 'Forin' then
		local vars, iterTuple, body = unpack(node)
		local var1 = comp(vars[1])
		local varRest = {select(2, unpack(vars))}
		return (
			'for(' ..
				'let ' .. join(map(varRest, comp), ',') .. ',[iter,state,' .. var1 .. ']=[' .. pack(iterTuple) .. '];;' ..
			'){' ..
				'[' .. join(map(vars, comp), ',') .. ']=iter(state,' .. var1 .. ');' ..
				'if(' .. var1 .. '===void 0)break;' ..
				comp(body) ..
			'}'
		)
	end

	if tag == 'Function' then
		local args, body = unpack(node)
		local js = '('
		for i, arg in ipairs(args) do
			if i ~= 1 then js = js .. ',' end
			local tag = arg.tag
			if tag == 'Id' then
				js = js .. comp(arg)
			elseif tag == 'Dots' then
				assert(i == #args)
				js = js .. '...args'
			end
		end
		js = js .. ')=>{' .. comp(body) .. ';return[]}'
		return js
	end

	if tag == 'Dots' then
		return '(args)'
	end

	if tag == 'Return' then
		return 'return[' .. pack(node) .. ']'
	end

	if tag == 'Nil' then return 'void 0' end
	if tag == 'True' then return '!0' end
	-- the funny
	if tag == 'False' then return '!3' end
	if tag == 'Number' then return tostring(node[1]) end
	if tag == 'String' then return ('%q'):format(node[1]) end

	if tag == 'Table' then
		local ti = 1
		local js = 'makeTable(['
		for i, entry in ipairs(node) do
			if i ~= 1 then js = js .. ',' end
			if entry.tag == 'Pair' then
				local key, value = unpack(entry)
				js = js .. '[' .. comp(key) .. ',' .. comp(value) .. ']'
			else
				js = js .. '[' .. ti .. ',' .. comp(entry) .. ']'
				ti = ti + 1
			end
		end
		js = js .. '])'
		return js
	end

	if tag == 'Local' then
		local vars, values = unpack(node)
		return 'let[' .. join(map(vars, comp), ',') .. ']=[' .. pack(values) .. ']'
	end

	if tag == 'Set' then
		local targets, values = unpack(node)
		local js = '{let values=[' .. pack(values) .. ']'
		for i, target in ipairs(targets) do
			js = js .. ';'
			local tag = target.tag
			if tag == 'Id' then
				js = js .. comp(target) .. '=values[' .. i - 1 .. ']'
			elseif tag == 'Index' then
				local indexTarget, key = unpack(target)
				js = js .. 'newindex_(' .. comp(indexTarget) .. ',' .. first(key) .. ',values[' .. i - 1 .. '])'
			end
		end
		js = js .. '}'
		return js
	end

	-- for local function, no idea why there's a separate node for them
	if tag == 'Localrec' then
		local targets, values = unpack(node)
		return 'let ' .. comp(targets[1]) .. '=' .. comp(values[1])
	end

	assert(false, tostring(tag))
end

local tree, err = mlc:src_to_ast(io.read('*a'))
print(preamble .. join(map(tree, comp), ';'))
