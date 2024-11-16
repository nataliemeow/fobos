/* @preserve
 * The following source section of this file is licensed under these terms:
 *
 * Copyright (c) 2024 nataliemeow
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 *    misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */
m4_changequote(`:-', `-:')
'use strict';

const
	ATTEMPT_TO = 'attempt to',
	NIL = 0, BOOLEAN = 1, NUMBER = 2, STRING = 3, FUNCTION = 4, TABLE = 5, FOREIGN = 6 /* values unknown to lua, see luaType */,
	TYPE_STRINGS = ['nil', 'boolean', 'number', 'string', 'function', 'table', 'foreign'];

class LuaError extends Error { }

m4_include(tables.m4.js)
m4_include(ops.m4.js)
m4_include(helpers.m4.js)
m4_include(stdlib.m4.js)
/* @preserve
 * End of section copyrighted to nataliemeow.
 */
