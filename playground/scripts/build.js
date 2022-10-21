import * as esbuild from 'esbuild';

import { config } from '../esbuild.config.js';


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
});
