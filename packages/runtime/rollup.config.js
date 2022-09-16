import * as fs from 'node:fs';

import { defineConfig } from 'rollup';
import * as esbuild from 'esbuild';

import pkg from './package.json';


let mangleFile = './mangle.json';
let mangleCache = {};

try {
	let source = fs.readFileSync(mangleFile, 'utf8');
	mangleCache = JSON.parse(source);
}
catch {}

let originalMangleCache = mangleCache;

export default defineConfig({
	input: {
		'public': './src/public.js',
		'internal': './src/internal/index.js',
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
			closeBundle () {
				if (isObjectInequal(originalMangleCache, mangleCache)) {
					console.log('writing new mangle cache');
					fs.writeFileSync(mangleFile, JSON.stringify(mangleCache, null, '\t') + '\n');
				}
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
