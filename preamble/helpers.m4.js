m4_dnl// Copyright (c) 2024 nataliemeow
m4_dnl// For conditions of distribution and use, see copyright notice in LICENSE
m4_dnl
const method = (target, name, ...args) => call_(index_(target, name), target, ...args);

const truth = (x) => x === false || x === void 0 ? void 0 : x;
