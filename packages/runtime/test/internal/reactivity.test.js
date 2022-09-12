import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';

import FakeTimers from '@sinonjs/fake-timers';
import { spy } from 'nanospy';
import { assertSpy } from '../utils.js';

import { ref, effect, computed, scope } from '../../src/internal/reactivity.js';


describe('ref', () => {
	it('creates a ref', () => {
		let value = ref(0);

		assert.equal(value.v, 0);

		assert.equal(value.v = 2, 2);

		value.v = 4;
		assert.equal(value.v, 4);
	});
});

describe('effects', () => {
	/** @type {?import('@sinonjs/fake-timers').InstalledClock} */
	let timer;

	before(() => {
		timer = FakeTimers.install();
	});

	after(() => {
		timer.uninstall();
	});

	it('creates an effect', () => {
		let value = ref(0);

		let fn = spy(() => value.v);
		let instance = effect(fn);

		assertSpy(fn, 1);

		value.v = 2;
		timer.runAll();
		assertSpy(fn, 2);

		value.v = 2;
		timer.runAll();

		assertSpy(fn, 2);

		value.v = 4;
		timer.runAll();
		assertSpy(fn, 3);

		instance._stop();

		value.v = 6;
		timer.runAll();
		assertSpy(fn, 3);
	});
});

describe('computed', () => {
	/** @type {?import('@sinonjs/fake-timers').InstalledClock} */
	let timer;

	before(() => {
		timer = FakeTimers.install();
	});

	after(() => {
		timer.uninstall();
	});

	it('creates a computed', () => {
		let value = ref(0);

		let fn = spy(() => value.v * 2);
		let double = computed(fn);

		assertSpy(fn, 0);

		assert.equal(double.v, 0);
		assertSpy(fn, 1);

		value.v = 2;
		timer.runAll();
		assert.equal(double.v, 4);
		assertSpy(fn, 2);

		value.v = 2;
		timer.runAll();
		assert.equal(double.v, 4);
		assertSpy(fn, 2);

		value.v = 3;
		timer.runAll();
		assert.equal(double.v, 6);
		assertSpy(fn, 3);
	});
});

describe('scope', () => {
	/** @type {?import('@sinonjs/fake-timers').InstalledClock} */
	let timer;

	before(() => {
		timer = FakeTimers.install();
	});

	after(() => {
		timer.uninstall();
	});

	it('creates a scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = spy(() => value.v);

		instance._run(() => {
			effect(fn);
		});

		assertSpy(fn, 1);

		value.v = 2;
		timer.runAll();
		assertSpy(fn, 2);

		instance._stop();

		value.v = 4;
		timer.runAll();
		assertSpy(fn, 2);
	});

	it('creates a nested scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = spy(() => value.v);

		instance._run(() => {
			let child = scope();

			child._run(() => {
				effect(fn);
			});
		});

		assertSpy(fn, 1);

		value.v = 2;
		timer.runAll();
		assertSpy(fn, 2);

		instance._stop();

		value.v = 4;
		timer.runAll();
		assertSpy(fn, 2);
	});
});
