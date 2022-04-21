import * as fs from 'node:fs/promises';


/**
 * @param {*} options
 * @returns {import('esbuild').Plugin}
 */
export default function ccss_plugin (options = {}) {
	let { filter = /\.module\.css$/, minify } = options;

	return {
		name: '@intrnl/esbuild-plugin-velvet/ccss',
		setup (build) {
			let transform = build.esbuild.transform;

			let should_minify = minify ?? build.initialOptions.minify;

			build.onLoad({ filter }, async (args) => {
				let { path: filename } = args;

				let source = await fs.readFile(filename, 'utf8');

				let result = await transform(source, {
					loader: 'css',
					minify: should_minify,
				});

				let js = (
					'import { css } from "@intrnl/velvet/internal";\n' +
					`export default css(${JSON.stringify(result.code.trim())});\n`
				);

				return {
					loader: 'js',
					contents: js,
					warnings: result.warnings,
				};
			});
		},
	};
}
