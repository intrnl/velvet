import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { build } from 'esbuild';
import { compile } from '@intrnl/velvet-compiler';

import { FSCache, getProjectRoot } from '@intrnl/fs-cache';


let VERSION = 0;

/**
 * @param {*} options
 * @returns {import('esbuild').Plugin}
 */
export default function velvet_plugin (options = {}) {
	let {
		include = /\.velvet$/i,
		prefix = 'x',
		minifyCSS,
		internal,
		cache = true
	} = options;

	return {
		name: '@intrnl/esbuild-plugin-velvet',
		async setup (build) {
			let fs_cache = cache && new FSCache({
				...await getProjectRoot('@intrnl/esbuild-plugin-vanilla-extract'),
			});

			let minify_css = minifyCSS ?? build.initialOptions.minify;

			build.onLoad({ filter: include }, async (args) => {
				let { path: filename, namespace } = args;

				if (namespace !== 'file' && namespace !== '') {
					return null;
				}

				const key = [
					VERSION,
					prefix,
					minify_css,
					internal,
				];

				const result = cache
					? await fs_cache.get(filename, key, () => loader(filename, prefix, minify_css, internal))
					: await loader(filename, prefix, minify_css, internal);

				return {
					loader: 'js',
					contents: result.js,
					watchFiles: result.dependencies,
				};
			});
		},
	};

	async function loader (filename, prefix, minify_css, internal) {
		let dirname = path.dirname(filename);

		let source = await fs.readFile(filename, 'utf-8');
		let dependencies = [];

		let result = await compile(source, {
			name: componentize(filename, prefix),
			internal: internal,
			css: async (css_source) => {
				let css_result = await bundle_css(dirname, css_source, minify_css);
				dependencies.push(...css_result.dependencies);

				return css_result.css;
			},
		});

		return { js: result, dependencies };
	}

	async function bundle_css (dirname, source, minify) {
		let result = await build({
			stdin: {
				loader: 'css',
				contents: source,
				resolveDir: dirname,
			},
			metafile: true,
			bundle: true,
			splitting: false,
			minify: minify,
			write: false,
		});

		return {
			css: result.outputFiles[0].text,
			dependencies: Object.keys(result.metafile.inputs)
				.filter((name) => name !== '<stdin>')
				.map((name) => path.resolve(name)),
		};
	}
}

export function componentize (filename, prefix = 'x') {
	if (!filename) {
		return null;
	}

	const parts = filename.split(/[/\\]/).map(encodeURI);

	if (parts.length > 1) {
		const index_match = parts[parts.length - 1].match(/^index(\.\w+)/);
		if (index_match) {
			parts.pop();
			parts[parts.length - 1] += index_match[1];
		}
	}

	const base = parts.pop()
		.replace(/%20/g, '-')
		.replace(/%/g, 'u')
		.replace(/^_+|_+$|\.[^.]+$/g, '')
		.replace(/[^a-zA-Z0-9-]+/g, '-')
		.replace(/(?<!^)[A-Z]/g, '-$&')
		.toLowerCase();

	if (!base) {
		throw new Error(`Could not derive component name from file ${filename}`);
	}

	return prefix + '-' + base;
}
