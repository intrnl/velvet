import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { build } from 'esbuild';
import { compile, COMPILER_VERSION, CompilerError } from '@intrnl/velvet-compiler';

import { FSCache, getProjectRoot } from '@intrnl/fs-cache';


let PLUGIN_VERSION = '0.2.0';

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
					PLUGIN_VERSION,
					COMPILER_VERSION,
					compileOptions,
					minify_css,
				];

				try {
					const result = cache
						? await fs_cache.get(filename, key, () => loader(filename, compileOptions, minify_css))
						: await loader(filename, compileOptions, minify_css);

					return {
						loader: 'js',
						contents: result.js,
						watchFiles: result.dependencies,
					};
				}
				catch (error) {
					if (!(error instanceof CompilerError)) {
						throw error;
					}

					let { message, source, start, end } = error;

					let line_text = source.split(/\r\n|\r|\n/g)[start.line - 1];
					let line_end = start.line === end.line ? end.column : line_text.length;

					return {
						errors: [{
							text: message,
							location: {
								line: start.line,
								column: start.column,
								length: line_end - start.column,
								lineText: line_text,
							},
						}],
					};
				}
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
