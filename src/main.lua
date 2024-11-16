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

local Compiler = require 'compiler'

local flags = {
	p = 'noPreamble'
}

local config = {
	noPreamble = false
}

local argc = #arg
local argI = 1
while argI < #arg do
	local opt = arg[argI]
	if opt:sub(1, 1) == '-' then
		local char = opt:sub(2, 2)
		local lower = char:lower()
		if flags[lower] then
			config[flags[lower]] = char ~= lower
		else
			error('unrecognized option \'' .. opt .. '\'')
		end
	end
	argI = argI + 2
end

local compiler = Compiler.new(config)
print(compiler.compSrc(io.read('*a')))
