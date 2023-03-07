import * as esbuild from 'esbuild';
import processes from 'node:child_process';

import { config } from '../esbuild.config.js';

import compilerPkg from '../node_modules/@intrnl/velvet-compiler/package.json' assert { type: 'json' };
import runtimePkg from '../node_modules/@intrnl/velvet/package.json' assert { type: 'json' };

const COMMIT_HASH = processes.execSync(`git rev-parse HEAD`, { encoding: 'utf-8' });

await esbuild.build({
	minify: true,
	logLevel: 'info',
	...config,
	format: 'esm',
	bundle: true,
	splitting: false,
	plugins: [
		...config.plugins || [],
	],
	define: {
		'DEV': 'false',
		'COMPILER_VERSION': `"v${compilerPkg.version}"`,
		'RUNTIME_VERSION': `"v${runtimePkg.version}"`,
		'COMMIT_HASH': `"${COMMIT_HASH.slice(0, 6)}"`,
	},
});
