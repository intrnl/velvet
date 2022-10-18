import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import util from 'node:util';

import { beforeEach, after } from 'mocha';


const eUpdateSnapshot = process.env.UPDATE_SNAPSHOT;
const shouldUpdateSnapshot = eUpdateSnapshot && eUpdateSnapshot !== '';

const banner = '// node-jestlike-snapshot v1';


let testPath = null;
let snapshotPath = null;
let suites = [];
let counter = 0;

let snapshotDirty = false;
let snapshotValue = null;
let unusedMap = new Map();

beforeEach(function () {
	let nextSuites = [];
	let instance = this.currentTest;

	let filename = this.currentTest.file;

	if (testPath !== filename) {
		if (testPath !== null) {
			if (snapshotDirty) {
				writeSnapshot();
			}

			snapshotValue = null;
		}

		testPath = filename;
		snapshotPath = path.join(filename, '..', '__snapshots__', path.basename(filename).replace(/\.([jt]sx?|mjs|[cm]ts)?$/i, '') + '.snap');
	}

	while (instance) {
		if (!instance.title) {
			break;
		}

		nextSuites.unshift(instance.title);
		instance = instance.parent;
	}

	suites = nextSuites;
	counter = 0;
});

after(function () {
	if (snapshotDirty) {
		writeSnapshot();
	}

	snapshotValue = null;

	let hasUnused = false;

	for (let [testPath, set] of unusedMap.entries()) {
		let hasLocalUnused = false;

		for (const name of set) {
			if (!hasUnused) {
				console.warn(`The following snapshot files contains unused snapshot cases:`);
				hasUnused = true;
			}

			if (!hasLocalUnused) {
				console.warn(`- ${path.relative(process.cwd(), testPath)}`);
				hasLocalUnused = true;
			}

			console.warn(`  - ${name}`);
		}
	}
});


export function assertSnapshot (actual) {
	actual = typeof actual !== 'string' ? util.inspect(actual) : actual;

	const snapshot = getSnapshot();
	const unusedNames = unusedMap.get(testPath);

	const name = `${suites.join(' > ')} ${++counter}`;

	if (!(name in snapshot)) {
		snapshotDirty = true;
		snapshot[name] = actual;
		return;
	}

	const expected = snapshot[name];

	unusedNames.delete(name);
	assert.strictEqual(actual, expected);
}

function getSnapshot () {
	if (snapshotValue !== null) {
		return snapshotValue;
	}

	if (snapshotPath === null) {
		throw new Error(`Unable to retrieve snapshot file location`);
	}

	if (shouldUpdateSnapshot) {
		snapshotValue = Object.create(null);
		return snapshotValue;
	}

	try {
		const source = fs.readFileSync(snapshotPath, 'utf-8');

		const snapshotExports = Object.create(null);
		const snapshotNames = unusedMap.get(testPath) || new Set();
		const load = new Function('exports', 'module', 'require', source);

		load(snapshotExports, null, null);

		for (const name in snapshotExports) {
			const value = snapshotExports[name];

			snapshotNames.add(name);
			snapshotExports[name] = removeExtraLinebreaks(value);
		}

		unusedMap.set(testPath, snapshotNames);

		snapshotValue = snapshotExports;
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			snapshotValue = Object.create(null);
		}
		else {
			throw error;
		}
	}

	return snapshotValue;
}

function writeSnapshot () {
	const collator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });

	let source = '';

	source += banner;

	for (const key of Object.keys(snapshotValue).sort(collator.compare)) {
		source += '\n\n';
		source += `exports[${printBacktickString(key)}] = `;
		source += printBacktickString(normalizeNewlines(addExtraLinebreaks(snapshotValue[key])));
	}

	source += '\n';

	fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
	fs.writeFileSync(snapshotPath, source);
}

function escapeBacktickString (str) {
	return str.replace(/`|\\|\${/g, '\\$&');
}

function printBacktickString (str) {
	return `\`${escapeBacktickString(str)}\``;
}

function normalizeNewlines (str) {
	return str.replace(/\r\n|\r/, '\n');
}

function addExtraLinebreaks (str) {
	return str.includes('\n') ? `\n${str}\n` : str;
}

function removeExtraLinebreaks (str) {
	return str.includes('\n') ? str.slice(1, -1) : str;
}
