import { describe, it, expect } from 'vitest';

import { finalize_program, transform_script } from '../src/transform_script.js';
import { parse, print } from '../src/utils/js_parse.js';


describe('ref', () => {
	it('unused variables', () => {
		let program = parse(`
			let value1;
			let value2 = 100;
			let value3 = new Date();
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('variables with no mutation', () => {
		let program = parse(`
			console.log({ value1, value2, value3, value4 });

			let value1;
			let value2 = 100;
			let value3 = new Date();
			let value4 = value2;

			console.log({ value1, value2, value3, value4 });

			function increment () {
				let value4 = 200;

				console.log({ value1, value2, value3, value4 });
			}
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('variables with mutation', () => {
		let program = parse(`
			console.log({ value1, value2, value3, value4 });

			let value1;
			let value2 = 100;
			let value3 = new Date();
			let value4 = value2;

			value1 += 1;
			value2 += 2;
			value3 += 3;
			value4 += 4;

			console.log({ value1, value2, value3, value4 });

			function increment () {
				let value4 = 200;

				value4 += 4;

				console.log({ value1, value2, value3, value4 });
			}
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('unmutated variable referencing mutated variable', () => {
		let program = parse(`
			let value1 = 100;
			let value2 = value1;

			value1 = 200;
			console.log(value1, value2);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable, referencing unmutated variable', () => {
		let program = parse(`
			let value1 = 100;
			let value2 = value1;

			value2 = 200;
			console.log(value1, value2);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('variable mutation with logical assignment operators', () => {
		let program = parse(`
			let value1 = 100;

			value1 ??= 200;
			value1 ||= 300;
			value1 &&= 300;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable accessing member property', () => {
		let program = parse(`
			let state = { count: 0 };
			let current_date = new Date();

			console.log(state.count);
			console.log(current_date.toISOString());
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable accessing member property', () => {
		let program = parse(`
			console.log(state.count);
			console.log(current_date.toISOString());

			let state = { count: 0 };
			let current_date = new Date();

			console.log(state.count);
			console.log(current_date.toISOString());

			state = { count: 0 };
			current_date = new Date();
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable mutating member property', () => {
		let program = parse(`
			let state = { count: 0 };

			state.count += 1;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable mutating member property', () => {
		let program = parse(`
			let state = { count: 0 };

			state = { count: 1 };
			console.log(state.count += 1);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});

describe('prop', () => {
	it('unused properties', () => {
		let program = parse(`
			export let value1;
			export let value2 = 100;
			export let value3 = new Date();
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('variables with no mutation', () => {
		let program = parse(`
			export let value1;
			export let value2 = 100;
			export let value3 = new Date();
			export let value4 = value2;

			console.log({ value1, value2, value3, value4 });

			function increment () {
				let value4 = 200;

				console.log({ value1, value2, value3, value4 });
			}
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('variables with mutation', () => {
		let program = parse(`
			console.log({ value1, value2, value3, value4 });

			export let value1;
			export let value2 = 100;
			export let value3 = new Date();
			export let value4 = value2;

			value1 += 1;
			value2 += 2;
			value3 += 3;
			value4 += 4;

			console.log({ value1, value2, value3, value4 });

			function increment () {
				let value4 = 200;

				value4 += 4;

				console.log({ value1, value2, value3, value4 });
			}
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('variable referencing unmutated ref', () => {
		let program = parse(`
			let value1 = 1;
			let value2 = () => {};
			export let value3 = value1;
			export let value4 = value2;
			export let value5 = value1 + value2;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('variable referencing mutated ref', () => {
		let program = parse(`
			let value1 = 1;
			let value2 = new Date();
			export let value3 = value1;
			export let value4 = value2;
			export let value5 = value1 + value2;

			value1 = 3;
			value2 *= 4;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('handles separate export specifier', () => {
		let program = parse(`
			let _count = 0;
			let foo = 1;

			export { _count as count, foo };
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('throws on exporting default', () => {
		let program = parse(`
			export default 123;
		`);

		expect(() => transform_script(program)).to.throw();
	});
});

describe('computed', () => {
	it('unused variables', () => {
		let program = parse(`
			$: value1;
			$: value2 = 100;
			$: value3 = new Date();
			foo: unrelated = 3;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variables', () => {
		let program = parse(`
			$: value1;
			$: value2 = 100;
			$: value3 = new Date();
			foo: unrelated = 2;

			value1 = 1;
			value2 = 2;
			value3 = 3;
			unrelated = 4;
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('variable referencing unmutated ref', () => {
		let program = parse(`
			let value1 = 100;
			let value2 = new Date();
			$: computed1 = value1 * 2;
			$: computed2 = value2;
			foo: unrelated = value1 + value2;

			console.log(value1, computed1);
			console.log(value2, computed2);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('variable referencing mutated ref', () => {
		let program = parse(`
			let value1 = 100;
			let value2 = new Date();
			$: computed1 = value1 * 2;
			$: computed2 = value2;
			foo: unrelated = value1 + value2;

			value1 = 200;
			value2 = Date.now();

			console.log(value1, computed1);
			console.log(value2, computed2);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutating variable referencing unmutated ref', () => {
		let program = parse(`
			let value1 = 100;
			$: computed = value1;
			foo: unrelated = value1;

			computed = 200;
			unrelated = 300;

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable referencing unmutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;
			$: unrelated = value1.foo;

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable referencing unmutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;
			foo: unrelated = value1.foo;

			computed = 234;
			unrelated = 345;

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable referencing mutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;
			foo: unrelated = value1.foo;

			value1 = { foo: 234 };

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable referencing mutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;
			foo: unrelated = value1.foo;

			value1 = { foo: 234 };
			computed = 345;
			unrelated = 123;

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});

describe('effect', () => {
	it('references unmutated refs', () => {
		let program = parse(`
			$: console.log(value1, value2);
			foo: console.log(value1, value2);

			$: {
				console.log(value1);
				console.log(value2);
			}

			foo: {
				console.log(value1);
				console.log(value2);
			}

			let value1 = { foo: 123 };
			let value2 = 123;

			$: console.log(value1, value2);
			foo: console.log(value1, value2);

			$: {
				console.log(value1);
				console.log(value2);
			}

			foo: {
				console.log(value1);
				console.log(value2);
			}
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('references mutated refs', () => {
		let program = parse(`
			$: console.log(value1, value2);
			foo: console.log(value1, value2);

			$: {
				console.log(value1);
				console.log(value2);
			}

			let value1 = { foo: 123 };
			let value2 = 123;

			value1 = { foo: 234 };
			value2 = 543;

			$: console.log(value1, value2);
			foo: console.log(value1, value2);

			$: {
				console.log(value1);
				console.log(value2);
			}

			foo: {
				console.log(value1);
				console.log(value2);
			}
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});

describe('store', () => {
	it('getter', () => {
		let program = parse(`
			$store;
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple getter references', () => {
		let program = parse(`
			function increment () {
				console.log($value1);
			}

			console.log($value2);
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('setter', () => {
		let program = parse(`
			$store = 123;
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple setter references', () => {
		let program = parse(`
			function increment () {
				$value1 += 1;
			}

			$value2 = 2;
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('subscribing to a ref', () => {
		let program = parse(`
			let value1;

			value1 = get_store();
			console.log($value1);
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('retrieving member property', () => {
		let program = parse(`
			console.log($foo.bar);
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('mutating member property', () => {
		let program = parse(`
			$foo.bar = 123;
		`);

		transform_script(program);

		expect(print(program)).toMatchSnapshot();
	});

	it('throws on lone $', () => {
		let program = parse(`
			console.log($);
		`);

		expect(() => transform_script(program)).to.throw();
	});

	it('throws on declaring $ variables', () => {
		let program = parse(`
			let $foo = 'bar';
		`);

		expect(() => transform_script(program)).to.throw();
	});

	it('only alter single $', () => {
		let program = parse(`
			console.log($foo, $$, $$$);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('no affecting inner scope', () => {
		let program = parse(`
			function log () {
				let $bar = 123;
				console.log($bar, $foo);
			}

			console.log($foo);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});

describe('bind', () => {
	it('const and function exports', () => {
		let program = parse(`
			export const magic = 420;

			export let open = false;

			export function toggle () {
				open = !open;
			}
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('separate export specifier', () => {
		let program = parse(`
			const magic = 420;

			export let open = false;

			function toggle () {
				open = !open;
			}

			export { magic as MAGIC_NUMBER, toggle };
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('only one specifier for a bind', () => {
		let program = parse(`
			export const magic = 420;

			export { magic as MAGIC_NUMBER };
		`);

		expect(() => transform_script(program)).to.throw();
	});
});

describe('reserved', () => {
	it('throws on declaring $$', () => {
		let program = parse(`
			export let $$foo = 'bar';
		`);

		expect(() => transform_script(program)).to.throw();
	});

	it('throws on reassigning $$', () => {
		let program = parse(`
			$$root = null;
		`);

		expect(() => transform_script(program)).to.throw();
	});

	it('can declare $$$ variables', () => {
		let program = parse(`
			export let $$$foo = 123;
			let $$$bar = 333;
		`);

		expect(() => transform_script(program)).to.not.throw();

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});

describe('final', () => {
	it('props test', () => {
		let program = parse(`
			export let count = -1;
			let magic = 420;

			export { magic as MAGIC };
		`);

		let { props_idx } = transform_script(program);
		finalize_program({ program, props_idx });

		let result = print(program);
		expect(result).toMatchSnapshot();
	});
});
