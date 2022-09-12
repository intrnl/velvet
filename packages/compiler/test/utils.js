// Automatic snapshot naming, very unsafe.
// Relies on --expose-internals flag.

import { snapshot } from 'node:assert/strict';
import TestInternals from 'internal/test_runner/test';

let suites = [];
let counter = 0;

let Test = TestInternals.Test;

let _run = Test.prototype.run
Test.prototype.run = async function () {
	let _suites = [];
	let instance = this;

	while (instance && instance.name !== '<root>') {
		_suites.unshift(instance.name);
		instance = instance.parent;
	}

	suites = _suites;
	counter = 0;
	return _run.apply(this);
}

export function assertSnapshot (value) {
	return snapshot(value, `${suites.join(' > ')} ${++counter}`);
}
