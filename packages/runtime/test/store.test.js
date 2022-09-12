import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { spy } from 'nanospy';
import { assertSpy } from './utils.js';

import { writable, readable, derived, get } from '../src/store/index.js';

describe('writable', () => {
	it('creates a writable store', () => {
		let fn = spy();
		let store = writable(2);

		store.subscribe(fn);
		assertSpy(fn, 1, [2]);

		store.set(4);
		assertSpy(fn, 2, [4]);

		store.update((n) => n * 2);
		assertSpy(fn, 3, [8]);
	});

	it('handles setting up notifier', () => {
		let count = 0;

		let store = writable(null, () => {
			count++;
			return () => count--;
		});

		let unsubscribe1 = store.subscribe(() => {});
		assert.equal(count, 1);

		let unsubscribe2 = store.subscribe(() => {});
		assert.equal(count, 1);

		unsubscribe1();
		assert.equal(count, 1);

		unsubscribe2();
		assert.equal(count, 0);
	});

	it('assumes immutable object', () => {
		let fn = spy();

		let obj = {};
		let store = writable(obj);

		store.subscribe(fn);
		assertSpy(fn, 1, [obj]);

		store.set(obj);
		assertSpy(fn, 1);

		store.update((prev) => prev);
		assertSpy(fn, 1);

		store.set({});
		assertSpy(fn, 2);
	});
});

describe('readable', () => {
	it('creates a readable store', () => {
		let running = false;
		let set;

		let store = readable(null, (_set) => {
			running = true;
			set = _set;

			set(1);

			return () => {
				running = false;
				set = null;
			};
		});

		assert.equal(running, false);

		let fn = spy();

		let unsubscribe = store.subscribe(fn);
		assert.equal(running, true);

		assertSpy(fn, 1, [1]);

		set(2);
		assertSpy(fn, 2, [2]);

		set(4);
		assertSpy(fn, 3, [4]);

		unsubscribe();

		assert.equal(running, false);
		assertSpy(fn, 3);
	});
});

describe('derived', () => {
	it('maps one store', () => {
		let fn = spy();

		let count = writable(1);
		let quad = derived(count, ($count) => $count * 4);

		let unsubscribe = quad.subscribe(fn);
		assertSpy(fn, 1, [4]);

		count.set(2);
		assertSpy(fn, 2, [8]);

		unsubscribe();

		count.set(3);
		assertSpy(fn, 2);
	});

	it('maps two store', () => {
		let fn = spy();

		let a = writable(5);
		let b = writable(2);

		let mul = derived([a, b], ([$a, $b]) => $a * $b);

		let unsubscribe = mul.subscribe(fn);
		assertSpy(fn, 1, [10]);

		a.set(10);
		assertSpy(fn, 2, [20]);

		b.set(3);
		assertSpy(fn, 3, [30]);

		unsubscribe();

		b.set(4);
		assertSpy(fn, 3);
	});

	it('manual derivation', () => {
		let fn = spy();

		let count = writable(0);
		let evens = derived(count, ($count, set) => {
			if ($count % 2 === 0) {
				set($count);
			}
		}, 0);

		let unsubscribe = evens.subscribe(fn);
		assertSpy(fn, 1, [0]);

		count.set(1);
		assertSpy(fn, 1);

		count.set(2);
		assertSpy(fn, 2, [2]);

		count.set(3);
		assertSpy(fn, 2);

		count.set(4);
		assertSpy(fn, 3, [4]);

		unsubscribe();

		count.set(5);
		assertSpy(fn, 3);

		count.set(6);
		assertSpy(fn, 3);
	});

	it('prevents diamond dependency', () => {
		let count = writable(0);

		let a = derived(count, ($count) => 'a' + $count);
		let b = derived(count, ($count) => 'b' + $count);

		let combined = derived([a, b], ([$a, $b]) => $a + $b);

		let fn = spy();

		let unsubscribe = combined.subscribe(fn);
		assertSpy(fn, 1, ['a0b0']);

		count.set(1);
		assertSpy(fn, 2, ['a1b1']);

		count.set(2);
		assertSpy(fn, 3, ['a2b2']);

		unsubscribe();

		count.set(3);
		assertSpy(fn, 3);
	});

	it('runs cleanup function', () => {
		let fn = spy();
		let cleanup = spy();

		let count = writable(1);

		let double = derived(count, ($count, set) => {
			set($count * 2);
			return cleanup;
		});

		let unsubscribe = double.subscribe(fn);
		assertSpy(fn, 1, [2]);
		assertSpy(cleanup, 0);

		count.set(2);
		assertSpy(fn, 2, [4]);
		assertSpy(cleanup, 1);

		count.set(3);
		assertSpy(fn, 3, [6]);
		assertSpy(cleanup, 2);

		unsubscribe();
		assertSpy(fn, 3);
		assertSpy(cleanup, 3);

		count.set(4);
		assertSpy(fn, 3);
		assertSpy(cleanup, 3);
	});
});

describe('get', () => {
	it('retrieves writable', () => {
		let store = writable(1);

		assert.equal(get(store), 1);

		store.set(2);
		assert.equal(get(store), 2);

		store.update((prev) => prev * 2);
		assert.equal(get(store), 4);
	});

	it('receives readable', () => {
		let count = 0;

		let store = readable(null, (set) => {
			set(count += 1);
		});

		assert.equal(get(store), 1);
		assert.equal(get(store), 2);
		assert.equal(get(store), 3);
	});

	it('retrieves derived', () => {
		let count = writable(1);
		let double = derived(count, ($count) => $count * 2);

		assert.equal(get(double), 2);

		count.set(2);
		assert.equal(get(double), 4);

		count.update((prev) => prev * 2);
		assert.equal(get(double), 8);
	});
});
