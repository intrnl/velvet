import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { build } from 'esbuild';
import { compile } from '@intrnl/velvet-compiler';

import { FSCache, getProjectRoot } from '@intrnl/fs-cache';


let VERSION = 1;

/**
 * @param {*} options
 * @returns {import('esbuild').Plugin}
 */
export default function velvet_plugin (options = {}) {
	let {
		include = /\.velvet$/i,
		cache = true,
		minifyCSS,
		compileOptions,
	} = options;

	return {
		name: '@intrnl/esbuild-plugin-velvet',
		async setup (build) {
			let fs_cache = cache && new FSCache({
				...await getProjectRoot('@intrnl/esbuild-plugin-vanilla-extract'),
			});

			let minify_css = minifyCSS ?? build.initialOptions.minify;

			build.onLoad({ filter: include, namespace: 'file' }, async (args) => {
				let { path: filename } = args;

				const key = [
					VERSION,
					compileOptions,
					minify_css,
				];

				const result = cache
					? await fs_cache.get(filename, key, () => loader(filename, compileOptions, minify_css))
					: await loader(filename, compileOptions, minify_css);

				return {
					loader: 'js',
					contents: result.js,
					watchFiles: result.dependencies,
				};
			});
		},
	};

	async function loader (filename, options, minify_css) {
		let source = await fs.readFile(filename, 'utf-8');
		let dependencies = [];

		let result = await compile(source, {
			filename,
			...options,
			css: async (css_source) => {
				if (options?.css) {
					css_source = options.css(css_source);
				}

				let css_result = await bundle_css(filename, css_source, minify_css);
				dependencies.push(...css_result.dependencies);

				return css_result.css;
			},
		});

		return { js: result, dependencies };
	}

	async function bundle_css (filename, source, minify) {
		let result = await build({
			stdin: {
				loader: 'css',
				contents: source,
				sourcefile: path.basename(filename),
				resolveDir: path.dirname(filename),
			},
			metafile: true,
			bundle: true,
			splitting: false,
			minify: minify,
			write: false,
		});


		return {
			css: result.outputFiles[0].text.trimEnd(),
			dependencies: Object.keys(result.metafile.inputs)
				.map((name) => path.resolve(name)),
		};
	}
}
