import { describe, expect, it } from 'bun:test';

import { spy } from 'nanospy';
import { assertSpy } from '../utils.js';

import { batch, computed, effect, scope, signal } from '../../src/internal/signals.js';

describe('signal', () => {
	it('creates a signal', () => {
		let count = signal(0);

		expect(count.value).toBe(0);

		count.value = 2;
		expect(count.value).toBe(2);

		count.set(4);
		expect(count.value).toBe(4);
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

		expect(double.value).toBe(0);
		assertSpy(fn, 1);

		count.value = 2;
		expect(double.value).toBe(4);
		assertSpy(fn, 2);

		count.value = 2;
		expect(double.value).toBe(4);
		assertSpy(fn, 2);

		count.value = 3;
		expect(double.value).toBe(6);
		assertSpy(fn, 3);
	});

	it('allows setting value to a computed', () => {
		let count = signal(1);
		let doubled = computed(() => count.value * 2);

		expect(doubled.value).toBe(2);

		doubled.value = 7;
		expect(doubled.value).toBe(7);
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

		expect(count.value).toBe(2);

		count.value = 6;
		expect(count.value).toBe(7);

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
