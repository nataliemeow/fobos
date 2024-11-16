m4_dnl// Copyright (c) 2024 nataliemeow
m4_dnl// For conditions of distribution and use, see copyright notice in LICENSE
m4_dnl
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
