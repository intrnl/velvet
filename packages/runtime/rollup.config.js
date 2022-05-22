import * as fs from 'node:fs';

import { defineConfig } from 'rollup';
import * as esbuild from 'esbuild';


let mangleFile = './mangle.json';
let mangleCache = {};

try {
	let source = fs.readFileSync(mangleFile, 'utf8');
	mangleCache = JSON.parse(source);
} catch {}

export default defineConfig({
	input: {
		'public': './src/public.js',
		'internal': './src/internal/index.js',
		'store': './src/store/index.js',
	},
	output: [
		{
			format: 'esm',
			dir: './dist/esm',
			generatedCode: 'es2015',
		},
		{
			format: 'cjs',
			dir: './dist/cjs',
			generatedCode: 'es2015',
		},
	],
	plugins: [
		{
			name: 'esbuild',
			transform (code) {
				let result = esbuild.transformSync(code, {
					sourcemap: true,
					mangleProps: /^_/,
					mangleCache: mangleCache,
				});

				mangleCache = result.mangleCache;

				return {
					code: result.code,
					map: result.map,
				};
			},
			closeBundle () {
				fs.writeFileSync(mangleFile, JSON.stringify(mangleCache, null, '\t'));
			},
		},
	],
});
