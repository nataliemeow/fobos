package = 'fobos'
version = 'dev-1'
source = {
	url = 'https://github.com/nataliemeow/fobos.git'
}
description = {
	detailed = 'Lua 5.1 to JavaScript transpiler',
	homepage = 'https://nat.envs.sh/fobos/',
	license = 'Zlib'
}
build = {
	type = 'builtin',
	modules = {
		main = 'main.lua',
	}
}

dependencies = {'lua == 5.1', 'metalua-parser >= 0.7.3-2'}
