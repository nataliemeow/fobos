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

local mlc = require 'metalua.compiler'.new()
local pp = require 'metalua.pprint'

local Compiler = {}

local preamble

local join = table.concat

local function map(list, f)
	local result = {}
	for i, v in ipairs(list) do
		result[i] = f(v, i)
	end
	return result
end

function Compiler.new(config)
	local compiler = {}

	local preamble = ''
	if not config.noPreamble then
		local handle = assert(io.open('preamble.js'), 'failed to open preamble.js')
		local contents = assert(handle:read('*a'), 'failed to read preamble.js')
		handle:close()
		preamble = contents
	end

	local function isTuple(node)
		local tag = node.tag
		return tag == 'Call' or tag == 'Dots' or tag == 'Invoke'
	end

	local comp

	local function first(node)
		if isTuple(node) then return comp(node) .. '[0]'
		else return comp(node) end
	end

	local function all(node)
		if isTuple(node) then return '...' .. comp(node)
		else return comp(node) end
	end

	local function allArr(node)
		if isTuple(node) then return comp(node)
		else return '[' .. comp(node) .. ']' end
	end

	local function pack(nodes)
		local js = ''
		for i, node in ipairs(nodes) do
			if i ~= 1 then js = js .. ',' end
			local tag = node.tag
			if isTuple(node) then
				if i == #nodes then
					js = js .. all(node)
				else
					js = js .. first(node)
				end
			else
				js = js .. comp(node)
			end
		end
		return js
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
				return 'truth(' .. first(args[1]) .. ')&&truth(' .. first(args[1]) .. ')'
			elseif op == 'or' then
				return 'truth(' .. first(args[1]) .. ')||truth(' .. first(args[1]) .. ')'
			end
			return op .. '_(' .. join(map(args, first), ',') .. ')'
		end

		if tag == 'Paren' then
			return '(' .. first(node[1]) .. ')'
		end

		if tag == 'Index' then
			local target, key = unpack(node)
			return 'index_(' .. first(target) .. ',' .. first(key) .. ')'
		end

		if tag == 'Call' then
			local target = node[1]
			local args = {select(2, unpack(node))}

			if target == 'JS_' then
				return args[1][1]
			end

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
				if i ~= 1 then js = js .. 'else' end
				if cond then js = js .. ' if(truth(' .. first(cond) .. '))' end
				js = js .. '{' .. comp(body) .. '}'
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
					'let ' .. join(map(varRest, comp), ',') .. ',[iter,state,' .. var1 .. ']=' ..
					'[' .. pack(iterTuple) .. '];;' ..
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
					assert(i == #args, 'trailing parameters after vararg literal')
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
		if tag == 'False' then return '!3' end
		if tag == 'Number' then return tostring(node[1]) end
		if tag == 'String' then return ('%q'):format(node[1]) end

		if tag == 'Table' then
			local ti = 1
			local js = 'makeTable(['

			local len = #node
			for i, entry in ipairs(node) do
				if i ~= 1 then js = js .. ',' end
				if entry.tag == 'Pair' then
					local key, value = unpack(entry)
					js = js .. '[' .. first(key) .. ',' .. first(value) .. ']'
				elseif i ~= len then
					js = js .. '[' .. ti .. ',' .. first(entry) .. ']'
					ti = ti + 1
				end
			end

			js = js .. ']'
			local rest = node[#node]
			if rest and rest.tag ~= 'Pair' then
				js = js .. ',' .. ti .. ',' .. allArr(rest)
			end
			js = js .. ')'

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

		if tag == 'Localrec' then
			local targets, values = unpack(node)
			local var =  comp(targets[1])
			return 'let ' .. var .. ';' .. var .. '=' .. comp(values[1])
		end

		assert(false, tostring(tag))
	end

	function compiler.compSrc(src)
		local tree, err = mlc:src_to_ast(src)
		return preamble .. comp(tree)
	end

	return compiler
end

return Compiler
