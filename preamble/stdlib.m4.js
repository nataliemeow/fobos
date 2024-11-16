m4_dnl// Copyright (c) 2024 nataliemeow
m4_dnl// For conditions of distribution and use, see copyright notice in LICENSE
m4_dnl
const l$getmetatable = (table) => [getmetatable(table)];
const l$setmetatable = (table, meta) => [setmetatable(table, meta)];
const l$rawget = (table, key) => [rawget(table, key)];
const l$rawset = (table, key, value) => [rawset(table, key, value)];
const l$tostring = (value) => [tostring_(value)];

const l$rawequal = (a, b) => [a === b];

const l$type = (value) => [TYPE_STRINGS[luaType(value)]];

const l$print = (...values) => {
	console.log(values.map(tostring_).join('\t'));
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
		if (i === -1) return [];
		return [++i, i + pattern.length];
	}]
]);
