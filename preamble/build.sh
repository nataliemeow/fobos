#!/bin/sh
cd "$(dirname "$0")"
m4 --version > /dev/null || >&2 echo "$0: m4 is not installed"
if [[ "$1" = -u ]]; then
	uglifyjs --version > /dev/null || >&2 echo "$0: uglifyjs is not installed"
	m4 -P preamble.m4.js | uglifyjs -m toplevel > ../preamble.js
fi
m4 -P preamble.m4.js > ../src/preamble.js
