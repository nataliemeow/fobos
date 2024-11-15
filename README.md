# Fobos

<img src="logo/logo-square.svg" alt="the Fobos logo, showing a square with a halo and a big 'FO' symbol orbiting around it" width=200 align=left>

Fobos is a **Lua 5.1 to JavaScript transpiler**, written in Lua 5.1.

[Discord Server](https://discord.gg/TWbdwawN)

> [!IMPORTANT]
> Fobos is not designed to port existing Lua software to JavaScript. Its main purpose is to introduce Lua as a language for web development.

> [!CAUTION]
> Fobos is currently in a *unfinished* state. Don't rely on it as it will contain breaking changes

## Parity

### Missing

- Standard library
- `goto`
- Support for global variables (this is oddly confusing to port?)
    - Use toplevel locals instead

### Inaccurate

- Table expressions will not handle unpacked values correctly: `{table.unpack({1, 2})}` would be `{1}`

### Notes

- All Lua variables are prefixed with `l$`
    - This means you must prefix your JS variables with `l$` to introduce them to the Lua namespace
- Tables cannot be indexed like JS objects from JS
    - Use `index_`/`newindex_` or `rawget`/`rawset` for this (the latter functions do not respect metamethods)
- JS objects cannot be indexed like tables from Lua
    - To work around this, define helper functions for getting (`(obj, key) => [obj[key]]`) and setting (`(obj, key, value) => [obj[key] = value]`)
- Functions must return arrays to be used in Lua
    - This means functions must *always* return. To prevent errors, you can put `return []` at the ends of your JS functions

## Post-ES5 features used

- [Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#browser_compatibility) (~2016)
- [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#browser_compatibility)/[const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const#browser_compatibility) (~2016)
- [Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#browser_compatibility) (~2015)
- [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#browser_compatibility) (~2014)
