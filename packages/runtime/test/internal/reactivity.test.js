import { vi, describe, it, expect } from 'vitest';

import { ref, access, effect, computed, scope } from '../../src/internal/reactivity.js';


describe('ref', () => {
	it('creates a ref', () => {
		let value = ref(0);

		expect(value(access)).toBe(0);

		expect(value(2)).toBe(2);

		value(4);
		expect(value(access)).toBe(4);
	});
});

describe('effects', () => {
	it('creates an effect', () => {
		let value = ref(0);

		let fn = vi.fn(() => value(access));
		let instance = effect(fn);

		expect(fn).toHaveBeenCalledTimes(1);

		value(2);
		expect(fn).toHaveBeenCalledTimes(2);

		value(2);
		expect(fn).toHaveBeenCalledTimes(2);

		value(4);
		expect(fn).toHaveBeenCalledTimes(3);

		instance.stop();

		value(6);
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe('computed', () => {
	it('creates a computed', () => {
		let value = ref(0);

		let fn = vi.fn(() => value(access) * 2);
		let double = computed(fn);

		expect(fn).toHaveBeenCalledTimes(1);

		expect(double(access)).toBe(0);
		expect(fn).toHaveBeenCalledTimes(1);

		value(2);
		expect(double(access)).toBe(4);
		expect(fn).toHaveBeenCalledTimes(2);

		value(2);
		expect(double(access)).toBe(4);
		expect(fn).toHaveBeenCalledTimes(2);

		value(3);
		expect(double(access)).toBe(6);
		expect(fn).toHaveBeenCalledTimes(3);
	});
});

describe('scope', () => {
	it('creates a scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = vi.fn(() => value(access));

		instance.run(() => {
			effect(fn);
		});

		expect(fn).toHaveBeenCalledTimes(1);

		value(2);
		expect(fn).toHaveBeenCalledTimes(2);

		instance.stop();

		value(4);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('creates a nested scope', () => {
		let instance = scope(true);

		let value = ref(0);
		let fn = vi.fn(() => value(access));

		instance.run(() => {
			let child = scope();

			child.run(() => {
				effect(fn);
			});
		});

		expect(fn).toHaveBeenCalledTimes(1);

		value(2);
		expect(fn).toHaveBeenCalledTimes(2);

		instance.stop();

		value(4);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
