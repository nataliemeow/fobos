m4_dnl// Copyright (c) 2024 nataliemeow
m4_dnl// For conditions of distribution and use, see copyright notice in LICENSE
m4_dnl
const getBasicMm = (a, key) => {
	const meta = getmetatable(a);
	if (!meta) return;
	return index_(meta, key);
};

const getBinMm = (a, b, key) => {
	const meta = getmetatable(a) || getmetatable(b);
	if (!meta) return;
	return index_(meta, key);
};

const getCompMm = (a, b, key) => {
	if (luaType(a) !== luaType(b)) return;

	const aMeta = getmetatable(a), bMeta = getmetatable(b);
	if (!aMeta || !bMeta) return;

	const aMm = index_(aMeta, key), bMm = index_(bMeta, key);
	return aMm === bMm ? aMm(a, b)[0] : void 0;
};
m4_dnl
m4_define(DefBasicOp, :-const $1_ = (a, ...args) => {
	const mm = getBasicMm(a, '__$1');
	if (mm) return mm(a, ...args)[0];
	$2
};-:)m4_dnl
m4_define(DefBinOp, :-const $1_ = (a, b) => {
	const mm = getBinMm(a, b, '__$1');
	if (mm) return mm(a, b)[0];
	$2
};-:)m4_dnl
m4_define(DefCompOp, :-const $1_ = (a, b) => {
	const mm = getCompMm(a, b, '__$1');
	if (mm) return mm(a, b)[0];
	$2
};-:)m4_dnl

DefBasicOp(newindex, return rawset(a, ...args))

// assert number
const an = (value) => {
	const lt = luaType(value);
	if (lt !== NUMBER)
		throw new LuaError(`${ATTEMPT_TO} perform arithmetic on a ${TYPE_STRINGS[lt]} value`);
	return value;
};
DefBinOp(add, return an(a) + an(b))
DefBinOp(sub, return an(a) - an(b))
DefBinOp(mul, return an(a) * an(b))
DefBinOp(div, return an(a) / an(b))
DefBinOp(mod, return (an(a) % an(b) + b) % b)
DefBinOp(pow, return isNaN(a) ? 0 / 0 : Math.pow(a, b))
DefBasicOp(unm, return -an(a))

DefBasicOp(len,
	const lt = luaType(table);
	if (lt !== TABLE)
		throw new LuaError(`${ATTEMPT_TO} get length of a ${TYPE_STRINGS[lt]} value`);
	return t.len;
)

DefCompOp(eq, a === b)
// TODO: add type checks here
DefCompOp(lt, a < b)
DefCompOp(le, a <= b)

DefBinOp(concat, :-:-
	const aLt = luaType(a), bLt = luaType(b);
	if (
		(aLt === STRING || aLt === NUMBER) &&
		(bLt === STRING || bLt === NUMBER)
	)
		return a.toString() + b.toString();
	else
		throw new LuaError(`${ATTEMPT_TO} concatenate a ${bLt} value`);
-:-:)

DefBasicOp(tostring, :-:-
	const lt = luaType(a);

	return (
		lt === NIL ? 'nil' :
		lt === BOOLEAN ? a.toString() :
		lt === NUMBER ? // number to string is not defined in manual, but clone PUC-Rio
			a >= 1e14 ?
				a.toExponential(13).replace(/\.?0+e/, 'e') : // 1.6900000000000e+14 => 1.69e+14
			isNaN(a) ?
				'nan' :
			isFinite(a) ?
				a.toString() :
			'inf' :
		lt === STRING ? a :
		lt === FUNCTION ? '<function>' :
		lt === TABLE ? '<table>' :
		'<foreign>'
	);
-:-:)

const index_ = (table, key) => {
	const lt = luaType(table);
	// return string library function for method lookups on strings
	if (lt === STRING) return l$string.obj[key];

	if (lt !== TABLE)
		throw new LuaError(`${ATTEMPT_TO} index a ${TYPE_STRINGS[lt]} value`);

	const meta = getmetatable(table);
	const rawValue = rawget(table, key);
	if (!meta) return rawValue;
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

const call_ = (callee, ...args) => {
	const mm = getBasicMm(callee, '__call');
	if (mm) return mm(callee, ...args);

	const lt = luaType(callee);
	if (lt !== FUNCTION)
		throw new LuaError(`${ATTEMPT_TO} call a ${TYPE_STRINGS[lt]} value`);

	return callee(...args);
};
