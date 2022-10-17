import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import util from 'node:util';

import TestInternals from 'internal/test_runner/test';


const eUpdateSnapshot = process.env.UPDATE_SNAPSHOT;
const shouldUpdateSnapshot = eUpdateSnapshot && eUpdateSnapshot !== '';

const banner = '// node-jestlike-snapshot v1';


function getSnapshotPath () {
	if (process.mainModule) {
		const { dir, name } = path.parse(process.mainModule.filename);
		return path.join(dir, '__snapshots__', `${name}.snap`);
	}

	if (!process.argv[1]) {
		throw new Error(`Unexpected snapshot assertion`);
	}

	const { dir, name } = path.parse(process.argv[1]);
	return path.join(dir, '__snapshots__', `${name}.snap`);
}

let suites = [];
let counter = 0;

let snapshotDirty = false;
let snapshotValue = null;
let unusedNames = new Set();


const Test = TestInternals.Test;
const _Test_run = Test.prototype.run;
Test.prototype.run = async function () {
	let _suites = [];
	let instance = this;

	while (instance && instance.name !== '<root>') {
		_suites.unshift(instance.name);
		instance = instance.parent;
	}

	suites = _suites;
	counter = 0;

	return _Test_run.apply(this);
};

process.once('beforeExit', () => {
	if (unusedNames.length > 1) {
		console.warn(`Snapshot file contains unused snapshot cases`);

		for (const name of unusedNames) {
			console.warn(`- ${name}`);
		}
	}

	if (snapshotDirty) {
		writeSnapshot();
	}
});


export function assertSnapshot (actual) {
	actual = typeof actual !== 'string' ? util.inspect(actual) : actual;

	const snapshot = getSnapshot();
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

	if (shouldUpdateSnapshot) {
		snapshotValue = Object.create(null);
		return snapshotValue;
	}

	try {
		const source = fs.readFileSync(getSnapshotPath(), 'utf-8');

		const snapshotExports = Object.create(null);
		const snapshotNames = new Set();
		const load = new Function('exports', 'module', 'require', source);

		load(snapshotExports, null, null);

		for (const name in snapshotExports) {
			const value = snapshotExports[name];

			snapshotNames.add(name);
			snapshotExports[name] = removeExtraLinebreaks(value);
		}

		snapshotValue = snapshotExports;
		unusedNames = snapshotNames;
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
	const filename = getSnapshotPath();

	let source = '';

	source += banner;

	for (const key of Object.keys(snapshotValue).sort(collator.compare)) {
		source += '\n\n';
		source += `exports[${printBacktickString(key)}] = `;
		source += printBacktickString(normalizeNewlines(addExtraLinebreaks(snapshotValue[key])));
	}

	source += '\n';

	fs.mkdirSync(path.dirname(filename), { recursive: true });
	fs.writeFileSync(filename, source);
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
