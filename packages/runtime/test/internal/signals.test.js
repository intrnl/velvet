import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';

import { spy } from 'nanospy';
import { assertSpy } from '../utils.js';

import { signal, computed, effect, batch, scope } from '../../src/internal/signals.js';


describe('signal', () => {
	it('creates a signal', () => {
		let count = signal(0);

		assert.equal(count.value, 0);

		count.value = 2;
		assert.equal(count.value, 2);

		count.set(4);
		assert.equal(count.value, 4);
	});

	it('peek() should not trigger a read', () => {
		let count = signal(0);

		let fn = spy(() => count.peek());
		let dispose = effect(fn);

		count.value = 2;
		assertSpy(fn, 1);

		dispose();
	});
});

describe('computed', () => {
	it('creates a computed', () => {
		let count = signal(0);

		let fn = spy(() => count.value * 2);
		let double = computed(fn);

		assertSpy(fn, 0);

		assert.equal(double.value, 0);
		assertSpy(fn, 1);

		count.value = 2;
		assert.equal(double.value, 4);
		assertSpy(fn, 2);

		count.value = 2;
		assert.equal(double.value, 4);
		assertSpy(fn, 2);

		count.value = 3;
		assert.equal(double.value, 6);
		assertSpy(fn, 3);
	});

	it('allows setting value to a computed', () => {
		let count = signal(1);
		let doubled = computed(() => count.value * 2);

		assert.equal(doubled.value, 2);

		doubled.value = 7;
		assert.equal(doubled.value, 7);
	});
});

describe('effect', () => {
	it('listens to signals', () => {
		let count = signal(0);

		let fn = spy(() => count.value);
		let cleanup = effect(fn);

		assertSpy(fn, 1);

		count.value = 2;
		assertSpy(fn, 2);

		count.value = 2;

		assertSpy(fn, 2);

		count.value = 4;
		assertSpy(fn, 3);

		cleanup();

		count.value = 6;
		assertSpy(fn, 3);
	});

	it('ignores cycle dependency', () => {
		let count = signal(1);

		let unsubscribe = effect(() => {
			count.value += 1;
		});

		assert.equal(count.value, 2);

		count.value = 6;
		assert.equal(count.value, 7);

		unsubscribe();
	});
});

describe('batch', () => {
	it('batches effect updates', () => {
		let scoped = scope();

		let count = signal(0);
		let bool = signal(false);

		let spy1 = spy(() => count.value);
		let spy2 = spy(() => bool.value);
		let spy3 = spy(() => count.value * bool.value);

		scoped.run(() => {
			effect(spy1);
			effect(spy2);
			effect(spy3);
		});

		assertSpy(spy1, 1);
		assertSpy(spy2, 1);
		assertSpy(spy3, 1);

		batch(() => {
			count.value = 2;
			bool.value = true;

			assertSpy(spy1, 1);
			assertSpy(spy2, 1);
			assertSpy(spy3, 1);
		});

		assertSpy(spy1, 2);
		assertSpy(spy2, 2);
		assertSpy(spy3, 2);
	});
});

describe('scope', () => {
	it('creates a scope', () => {
		let instance = scope(true);

		let count = signal(0);
		let fn = spy(() => count.value);

		instance.run(() => {
			effect(fn);
		});

		assertSpy(fn, 1);

		count.value = 2;
		assertSpy(fn, 2);

		instance.clear();

		count.value = 4;
		assertSpy(fn, 2);
	});

	it('creates a nested scope', () => {
		let instance = scope(true);

		let count = signal(0);
		let fn = spy(() => count.value);

		instance.run(() => {
			let child = scope();

			child.run(() => {
				effect(fn);
			});
		});

		assertSpy(fn, 1);

		count.value = 2;
		assertSpy(fn, 2);

		instance.clear();

		count.value = 4;
		assertSpy(fn, 2);
	});
});
