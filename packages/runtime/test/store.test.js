import { vi, describe, it, expect } from 'vitest';

import { writable, readable, derived } from '../store/index.js';


describe('writable', () => {
	it('creates a writable store', () => {
		let fn = vi.fn();
		let store = writable(2);

		store.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 2);

		store.set(4);
		expect(fn).toHaveBeenNthCalledWith(2, 4);

		store.update((n) => n * 2);
		expect(fn).toHaveBeenNthCalledWith(3, 8);

		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('handles setting up notifier', () => {
		let count = 0;

		let store = writable(null, () => {
			count++;
			return () => count--;
		});

		let unsubscribe1 = store.subscribe(() => {});
		expect(count).toBe(1);

		let unsubscribe2 = store.subscribe(() => {});
		expect(count).toBe(1);

		unsubscribe1();
		expect(count).toBe(1);

		unsubscribe2();
		expect(count).toBe(0);
	});

	it('assumes immutable object', () => {
		let fn = vi.fn();

		let obj = {};
		let store = writable(obj);

		store.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, obj);

		store.set(obj);
		expect(fn).toHaveBeenCalledTimes(1);

		store.update((prev) => prev);
		expect(fn).toHaveBeenCalledTimes(1);

		store.set({});
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('allows direct retrieval', () => {
		let store = writable(1);

		expect(store.get()).toBe(1);

		store.set(2);
		expect(store.get()).toBe(2);

		store.update((prev) => prev * 2);
		expect(store.get()).toBe(4);
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

		expect(running).toBeFalsy();

		let fn = vi.fn();

		let unsubscribe = store.subscribe(fn);
		expect(running).toBeTruthy();

		expect(fn).toHaveBeenNthCalledWith(1, 1);

		set(2);
		expect(fn).toHaveBeenNthCalledWith(2, 2);

		set(4);
		expect(fn).toHaveBeenNthCalledWith(3, 4);

		unsubscribe();
		expect(running).toBeFalsy();
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe('derived', () => {
	it('maps one store', () => {
		let fn = vi.fn();

		let count = writable(1);
		let quad = derived(count, ($count) => $count * 4);

		let unsubscribe = quad.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 4);

		count.set(2);
		expect(fn).toHaveBeenNthCalledWith(2, 8);

		unsubscribe();

		count.set(3);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('maps two store', () => {
		let fn = vi.fn();

		let a = writable(5);
		let b = writable(2);

		let mul = derived([a, b], ([$a, $b]) => $a * $b);

		let unsubscribe = mul.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 10);

		a.set(10);
		expect(fn).toHaveBeenNthCalledWith(2, 20);

		b.set(3);
		expect(fn).toHaveBeenNthCalledWith(3, 30);

		unsubscribe();

		b.set(4);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('manual derivation', () => {
		let fn = vi.fn();

		let count = writable(0);
		let evens = derived(count, ($count, set) => {
			if ($count % 2 === 0) {
				set($count);
			}
		}, 0);

		let unsubscribe = evens.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 0);

		count.set(1);
		expect(fn).toHaveBeenCalledTimes(1);

		count.set(2);
		expect(fn).toHaveBeenNthCalledWith(2, 2);

		count.set(3);
		expect(fn).toHaveBeenCalledTimes(2);

		count.set(4);
		expect(fn).toHaveBeenNthCalledWith(3, 4);

		unsubscribe();

		count.set(5);
		expect(fn).toHaveBeenCalledTimes(3);

		count.set(6);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('prevents diamond dependency', () => {
		let count = writable(0);

		let a = derived(count, ($count) => 'a' + $count);
		let b = derived(count, ($count) => 'b' + $count);

		let combined = derived([a, b], ([$a, $b]) => $a + $b);

		let fn = vi.fn();

		let unsubscribe = combined.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 'a0b0');

		count.set(1);
		expect(fn).toHaveBeenNthCalledWith(2, 'a1b1');

		count.set(2);
		expect(fn).toHaveBeenNthCalledWith(3, 'a2b2');

		unsubscribe();

		count.set(3);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('runs cleanup function', () => {
		let fn = vi.fn();
		let cleanup = vi.fn();

		let count = writable(1);

		let double = derived(count, ($count, set) => {
			set($count * 2);
			return cleanup;
		});

		let unsubscribe = double.subscribe(fn);
		expect(fn).toHaveBeenNthCalledWith(1, 2);
		expect(cleanup).toHaveBeenCalledTimes(0);

		count.set(2);
		expect(fn).toHaveBeenNthCalledWith(2, 4);
		expect(cleanup).toHaveBeenCalledTimes(1);

		count.set(3);
		expect(fn).toHaveBeenNthCalledWith(3, 6);
		expect(cleanup).toHaveBeenCalledTimes(2);

		unsubscribe();
		expect(fn).toHaveBeenCalledTimes(3);
		expect(cleanup).toHaveBeenCalledTimes(3);

		count.set(4);
		expect(fn).toHaveBeenCalledTimes(3);
		expect(cleanup).toHaveBeenCalledTimes(3);
	});
});
