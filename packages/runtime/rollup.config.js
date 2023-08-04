import * as esbuild from 'esbuild';
import { defineConfig } from 'rollup';

import pkg from './package.json' assert { type: 'json' };

let mangleCache = {};

export default defineConfig({
	input: {
		'public': './src/public.js',
		'macro': './src/macro.js',
		'internal': './src/internal/index.js',
	},
	output: [
		{
			format: 'esm',
			dir: './dist',
			generatedCode: 'es2015',
		},
	],
	plugins: [
		{
			name: 'esbuild',
			async renderChunk (code) {
				let result = await esbuild.transform(code, {
					sourcemap: true,
					mangleProps: /^_/,
					mangleCache: mangleCache,
					define: {
						'process.env.RUNTIME_VERSION': `"v${pkg.version}"`,
					},
				});

				mangleCache = result.mangleCache;

				return {
					code: result.code,
					map: result.map,
				};
			},
		},
	],
});
