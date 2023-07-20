import * as esbuild from 'esbuild';
import { defineConfig } from 'rollup';

import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
	input: {
		plugin: './src/index.js',
		ccss_plugin: './src/ccss_plugin.js',
	},
	output: [
		{
			format: 'esm',
			dir: './dist',
			preserveModules: true,
			generatedCode: 'es2015',
		},
	],
	external: [
		'node:fs/promises',
		'node:path',
		'esbuild',
		'@intrnl/velvet-compiler',
		'@intrnl/fs-cache',
	],
	plugins: [
		{
			name: 'esbuild',
			transform (code) {
				let result = esbuild.transformSync(code, {
					sourcemap: true,
					define: {
						'process.env.PLUGIN_VERSION': `"v${pkg.version}"`,
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
