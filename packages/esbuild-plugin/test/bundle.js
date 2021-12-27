import { build } from 'esbuild';
import velvetPlugin from '../src/index.js';


await build({
	entryPoints: ['./App.velvet'],
	outfile: './app.js',

	bundle: true,
	platform: 'browser',
	format: 'esm',

	plugins: [
		velvetPlugin({ minifyCSS: true }),
	],
});
