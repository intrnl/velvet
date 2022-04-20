import { build } from 'esbuild';
import velvetPlugin, { ccssPlugin } from '../src/index.js';

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
