import * as esbuild from 'esbuild';

import velvet from '@intrnl/esbuild-plugin-velvet';


/** @type {esbuild.BuildOptions} */
export let config = {
	entryPoints: [
		'src/dbmonster/index.js',
		'src/spiral/index.js',
		'src/todomvc/index.js',
	],
	outdir: 'dist/_assets',

	sourcemap: true,

	plugins: [
		velvet({ cache: false }),
	],
	loader: {
		'.svg': 'file',
	},
};
