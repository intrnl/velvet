import { defineConfig } from 'rollup';
import * as esbuild from 'esbuild';

import pkg from './package.json' assert { type: 'json' };


export default defineConfig({
	input: './src/index.js',
	output: [
		{
			format: 'esm',
			dir: './dist/esm',
			preserveModules: true,
			generatedCode: 'es2015',
		},
		{
			format: 'cjs',
			dir: './dist/cjs',
			preserveModules: true,
			generatedCode: 'es2015',
		},
	],
	external: ['acorn', 'astring', 'gensync'],
	plugins: [
		{
			name: 'esbuild',
			transform (code) {
				let result = esbuild.transformSync(code, {
					sourcemap: true,
					define: {
						'process.env.COMPILER_VERSION': `"v${pkg.version}"`,
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
