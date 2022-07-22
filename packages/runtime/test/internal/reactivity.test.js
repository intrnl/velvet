import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ref, effect, computed, scope } from '../../src/internal/reactivity.js';


describe('ref', () => {
	it('creates a ref', () => {
		let value = ref(0);

		expect(value.v).toBe(0);

		expect(value.v = 2).toBe(2);

		value.v = 4;
		expect(value.v).toBe(4);
	});
});

describe('effects', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useFakeTimers();
	});

	it('creates an effect', () => {
		let value = ref(0);

		let fn = vi.fn(() => value.v);
		let instance = effect(fn);

		expect(fn).toHaveBeenCalledTimes(1);

		value.v = 2;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(2);

		value.v = 2;
		vi.runAllTimers();

		expect(fn).toHaveBeenCalledTimes(2);

		value.v = 4;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(3);

		instance._stop();

		value.v = 6;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe('computed', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useFakeTimers();
	});

	it('creates a computed', () => {
		let value = ref(0);

		let fn = vi.fn(() => value.v * 2);
		let double = computed(fn);

		expect(fn).toHaveBeenCalledTimes(0);

		expect(double.v).toBe(0);
		expect(fn).toHaveBeenCalledTimes(1);

		value.v = 2;
		vi.runAllTimers();
		expect(double.v).toBe(4);
		expect(fn).toHaveBeenCalledTimes(2);

		value.v = 2;
		vi.runAllTimers();
		expect(double.v).toBe(4);
		expect(fn).toHaveBeenCalledTimes(2);

		value.v = 3;
		vi.runAllTimers();
		expect(double.v).toBe(6);
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe('scope', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useFakeTimers();
	});

	it('creates a scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = vi.fn(() => value.v);

		instance._run(() => {
			effect(fn);
		});

		expect(fn).toHaveBeenCalledTimes(1);

		value.v = 2;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(2);

		instance._stop();

		value.v = 4;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('creates a nested scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = vi.fn(() => value.v);

		instance._run(() => {
			let child = scope();

			child._run(() => {
				effect(fn);
			});
		});

		expect(fn).toHaveBeenCalledTimes(1);

		value.v = 2;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(2);

		instance._stop();

		value.v = 4;
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
