import * as esbuild from 'esbuild';
import { defineConfig } from 'rollup';

import nodeResolve from '@rollup/plugin-node-resolve';

import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
	input: './src/index.js',
	output: [
		{
			format: 'esm',
			dir: './dist',
			preserveModules: true,
			generatedCode: 'es2015',
		},
	],
	external: ['acorn', 'astring', 'gensync'],
	plugins: [
		nodeResolve(),
		{
			name: 'esbuild',
			transform (code) {
				let result = esbuild.transformSync(code, {
					sourcemap: true,
					define: {
						'process.env.COMPILER_VERSION': `"v${pkg.version}"`,
						'process.env.NODE_ENV': `"production"`,
					},
				});

				return {
					code: result.code,
					map: result.map,
				};
			},
		},
	],
});

function isObjectInequal (a, b) {
	for (let key in a) {
		if (!(key in b)) {
			return true;
		}
	}

	for (let key in b) {
		if (a[key] !== b[key]) {
			return true;
		}
	}

	return false;
}
