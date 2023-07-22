import * as esbuild from 'esbuild';
import * as os from 'os';

import { config } from '../esbuild.config.js';

import compilerPkg from '../../node_modules/@intrnl/velvet-compiler/package.json' assert { type: 'json' };
import runtimePkg from '../../node_modules/@intrnl/velvet/package.json' assert { type: 'json' };

const args = process.argv.slice(2);

const serverOptions = {
	host: args.includes('--expose') ? '0.0.0.0' : '127.0.0.1',
	port: undefined,
};

const printServerInfo = ({ host, port }) => {
	if (host === '127.0.0.1') {
		console.info(`> local: http://${host}:${port}`);
		console.info(`> network: not exposed`);
	}
	else {
		const mapping = os.networkInterfaces();

		for (const intrf in mapping) {
			const addresses = mapping[intrf];

			for (const address of addresses) {
				// for some reason, @types/node tells you that `.family` is a string,
				// while in reality, it's a number, so we'll just check for both.
				if (address.family !== 'IPv4' && address.family !== 4) {
					continue;
				}

				const type = address.internal ? 'local' : 'network';
				const hostname = address.internal ? 'localhost' : address.address;

				console.info(`> ${type}: http://${hostname}:${port} (${intrf})`);
			}
		}
	}

	console.log('');
};

const context = await esbuild.context({
	minify: false,
	...config,
	format: 'esm',
	bundle: true,
	splitting: false,
	sourcemap: true,
	define: {
		'DEV': 'true',
		'COMPILER_VERSION': `"v${compilerPkg.version}"`,
		'RUNTIME_VERSION': `"v${runtimePkg.version}"`,
		'COMMIT_HASH': '"DEV"',
	},
	plugins: [
		...config.plugins || [],
	],
});

const internal = await context.serve({
	servedir: 'dist/',
	host: serverOptions.host,
});

printServerInfo({ host: internal.host, port: internal.port });
