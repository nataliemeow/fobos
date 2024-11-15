/* Copyright (c) 2024 nataliemeow
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

'use strict';

class LuaError extends Error { }

const tableProto = {};

const makeTable = (entries, restKey, restValues) => {
	// we use a prototype to configure an object as a table, see luaType
	const table = Object.create(tableProto);
	// tables use a combination of an object, an array and a Map to store their fields; see rawget and rawset
	// we use an object along with a Map to let engines optimize the objects to hidden classes, e.g. https://v8.dev/blog/fast-properties
	table.obj = table.arr = table.map = null;
	// the metatable, declaring it here might help with JIT?
	table.meta = void 0;

	for (const [key, value] of entries)
		rawset(table, key, value);

	if (restKey)
		for (const [dKey, value] of restValues.entries())
			rawset(table, restKey + dKey, value);

	return table;
};

const
	ATTEMPT_TO = 'attempt to',
	NIL = 0, BOOLEAN = 1, NUMBER = 2, STRING = 3, FUNCTION = 4, TABLE = 5, FOREIGN = 6 /* values unknown to lua, see luaType */,
	TYPE_STRINGS = ['nil', 'boolean', 'number', 'string', 'function', 'table', 'foreign'];

const luaType = (value) => {
	const jst = typeof value;
	return (
		jst === 'boolean' ? BOOLEAN :
		jst === 'number' ? NUMBER :
		jst === 'string' ? STRING :
		jst === 'function' ? FUNCTION :
		// note: typeof null is 'object'
		jst === 'object' && jst !== null && Object.getPrototypeOf(value) === tableProto ? TABLE :
		value === void 0 ? NIL :
		FOREIGN
	);
};

const getmetatable = (table) => luaType(table) === TABLE ? table.meta : void 0;

const setmetatable = (table, meta) => {
	const lt = luaType(meta);
	if (lt !== TABLE && lt !== NIL)
		throw new LuaError('expected table or nil as metatable');
	table.meta = meta;
	return table;
}

const rawget = (table, key) => {
	const lt = luaType(table);
	if (lt !== TABLE) throw new LuaError(`${ATTEMPT_TO} rawget a ${TYPE_STRINGS[lt]} value`);

	return (
		luaType(key) === STRING && key !== '__proto__' ?
			table.obj === null ? void 0 : table.obj[key] :

		Number.isSafeInteger(key) ?
			table.arr === null ? void 0 : table.arr[key - 1] :

		table.map === null ? void 0 : table.map.get(key)
	);
};

const rawset = (table, key, value) => {
	const lt = luaType(table);
	if (lt !== TABLE) throw new LuaError(`${ATTEMPT_TO} rawset a ${TYPE_STRINGS[lt]} value`);

	// key called '__proto__' is stored in the Map, just to stay safe
	if (luaType(key) === STRING && key !== '__proto__') {
		if (table.obj === null) table.obj = Object.create(null);
		table.obj[key] = value;
	} else if (Number.isSafeInteger(key)) {
		if (table.arr === null) table.arr = [];
		table.arr[key - 1] = value;

		// probably valid, https://www.lua.org/manual/5.1/manual.html#2.5.5
		let len = 0;
		while (len++ in table.arr);
		table.len = len;
	} else {
		if (table.map === null) table.map = new Map();
		table.map.set(key, value);
	}
};

const makeBasicOp = (name, fallback) => (a, ...args) => {
	const meta = getmetatable(a);
	if (meta) {
		const mm = index_(meta, '__' + name);
		if (mm) return mm(a, ...args);
	}
	return fallback(a, ...args);
};

const makeBinOp = (name, fallback) => (a, b) => {
	const meta = getmetatable(a) || getmetatable(b);
	if (meta) {
		const mm = index_(meta, '__' + name);
		if (mm) return mm(a, b)[0];
	}
	return fallback(a, b);
};

const makeComp = (name, fallback) => (a, b) => {
	const key = '__' + name;
	if (luaType(a) !== luaType(b)) return fallback(a, b);

	const aMeta = getmetatable(a), bMeta = getmetatable(b);
	if (!aMeta || !bMeta) return fallback(a, b);

	const aMm = index_(aMeta, key), bMm = index_(bMeta, key);
	return aMm === bMm ? aMm(a, b)[0] : void 0;
};

const tostring = makeBasicOp('tostring', (value) => {
	const lt = luaType(value);

	return (
		lt === NIL ? 'nil' :
		lt === BOOLEAN ? value.toString() :
		lt === NUMBER ? // number to string is not defined in manual, but mock PUC-Rio
			value >= 1e14 ?
				value.toExponential(13).replace(/\.?0+e/, 'e') : // 1.6900000000000e+14 => 1.69e+14
			isNaN(value) ?
				'nan' :
			isFinite(value) ?
				value.toString() :
			'inf' :
		lt === STRING ? value :
		lt === FUNCTION ? '<function>' :
		lt === TABLE ? '<table>' :
		'<foreign>'
	);
});

const index_ = (table, key) => {
	const lt = luaType(table);
	if (lt === STRING) // return string library function for method lookups on strings
		return l$string.obj[key];

	if (lt !== TABLE)
		throw new LuaError(`${ATTEMPT_TO} index a ${TYPE_STRINGS[lt]} value`);

	const meta = getmetatable(table);
	const rawValue = rawget(table, key);
	if (!meta) return rawget(table, key);

	if (rawValue !== void 0) return rawValue;

	const metaIndex = rawget(meta, '__index');
	const metaIndexLt = luaType(metaIndex);
	return (
		metaIndexLt === TABLE ?
			index_(metaIndex, key) :
		metaIndexLt === FUNCTION ?
			metaIndex(table, key)[0] :
		void 0
	);
};
const newindex_ = makeBasicOp('newindex', rawset);
const call_ = makeBasicOp('call', (a, ...args) => {
	const lt = luaType(a);
	if (lt !== FUNCTION)
		throw new LuaError(`${ATTEMPT_TO} call a ${TYPE_STRINGS[lt]} value`);
	return a(...args);
});

const eq_ = makeComp('eq', (a, b) => a === b);

const add_ = makeBinOp('add', (a, b) => a + b);
const concat_ = makeBinOp('concat', (a, b) => {
	const aLt = luaType(a), bLt = luaType(b);
	if (aLt === STRING || aLt === NUMBER) {
		if (bLt === STRING || bLt === NUMBER)
			return a.toString() + b.toString();
		else
			throw new LuaError(`${ATTEMPT_TO} concatenate a ${bLt} value`);
	} else
		throw new LuaError(`${ATTEMPT_TO} concatenate a ${aLt} value`);
});

const method = (target, name, ...args) => call_(index_(target, name), target, ...args);

const truth = (x) => x === false || x === void 0 ? void 0 : x;

// i should write a factory function for this maybe but i don't want to waste resources with factories unless it gets too complicated otherwise
const l$getmetatable = (...args) => [getmetatable(...args)];
const l$setmetatable = (...args) => [setmetatable(...args)];
const l$rawget = (...args) => [rawget(...args)];
const l$rawset = (...args) => [rawset(...args)];
const l$tostring = (...args) => [tostring(...args)];

const l$type = (value) => [TYPE_STRINGS[luaType(value)]];

const l$print = (...values) => {
	console.log(values.map(tostring).join('\t'));
	return [];
};

const l$pcall = (f, ...args) => {
	try {
		return [true, f(...args)];
	} catch (e) {
		if (!(e instanceof LuaError)) throw e;
		return [false, e.message];
	}
};

const ipairsIter = (table, i) => {
	const v = index_(table, ++i);
	return v === void 0 ? [] : [i, v];
};

const l$ipairs = (table) => [ipairsIter, table, 0];

const pairsGen = function*(table) {
	if (table.arr !== null)
		for (let i = 0, v; v = table.arr[i]; i++)
			yield [i + 1, v];

	if (table.obj !== null)
		for (const key in table.obj)
			yield [key, table.obj[key]];

	if (table.map !== null)
		for (const pair in table.map)
			yield pair;

	yield [];
};
const l$pairs = (table) => {
	const gen = pairsGen(table);
	return [() => gen.next().value, table, void 0];
};

const l$unpack = (table) => {
	const values = [];
	for (let i = 1, v; v = rawget(table, i); i++)
		values.push(v);
	return values;
};

const l$_pack = (...values) => {
	const table = makeTable();
	for (const [i, value] of values.entries())
		rawset(table, i + 1, value);
	return [table];
};

const l$string = makeTable([
	['find', (s, pattern, init = 1) => {
		let i = s.indexOf(pattern, init - 1);
		return [++i, i + pattern.length];
	}]
]);
