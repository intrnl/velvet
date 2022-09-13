import { build } from 'esbuild';

import velvetPlugin from '../src/index.js';
import ccssPlugin from '../src/ccss_plugin.js';

await build({
	entryPoints: ['./App.velvet'],
	outfile: './app.js',

	bundle: true,
	platform: 'browser',
	format: 'esm',

	plugins: [
		velvetPlugin({ minifyCSS: true, cache: false }),
		ccssPlugin(),
	],
});
