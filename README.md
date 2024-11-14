# ![Fobos logo](logos/logo-square.svg) Fobos

Fobos is a Lua 5.1 to JavaScript transpiler, written in Lua 5.1.

**A notice --** Fobos is not designed to port existing Lua software to JavaScript. Its main purpose is to introduce Lua as a language for web development.

**Another notice -- don't rely on this for another few months.**

## Parity

### Missing

- Standard library

### Inaccurate

- Table expressions will not handle unpacked values correctly: `{table.unpack({1, 2})}` would be `{1}`.

## Post-ES5 features used

- [Destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#browser_compatibility) (~2016)
- [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#browser_compatibility)/[const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const#browser_compatibility) (~2016)
- [Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#browser_compatibility) (~2015)
- [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#browser_compatibility) (~2014)
