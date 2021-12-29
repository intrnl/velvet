import { describe, it, expect } from 'vitest';

import { compileSync } from '../src/compile.js';


describe('module context', () => {
	it('allow top level await', () => {
		let source = `
			<script context=module>
				let number = await Promise.resolve(420);
			</script>

			<div>the number is {number}</div>
		`;

		let result = compileSync(source);
		expect(result).toMatchSnapshot();
	});
});

describe('script context', () => {
	it('throws on await', () => {
		let source = `
			<script>
				let number = await Promise.resolve(123);
			</script>

			<div>the number is {number}</div>
		`;

		try {
			compileSync(source);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});
});

describe('props', () => {
	it('throws on two variable exported to one name', () => {
		let source = `
			<script>
			let foo = 1;
			let bar = 2;

			export { foo as baz, bar as baz };
			</script>
		`;

		try {
			compileSync(source);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});
});

describe('store', () => {
	it('throws on lone $', () => {
		let source = `
			<script>
			console.log($);
			</script>
		`;

		try {
			compileSync(source);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});
});
