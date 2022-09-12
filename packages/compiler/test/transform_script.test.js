import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { assertSnapshot } from './utils.js';

import { finalize_program, finalize_template, transform_script } from '../src/transform_script.js';
import { parse, print } from '../src/utils/js_parse.js';


describe('ref', () => {
	it('unused variables', async () => {
		let program = parse(`
			let value1;
			let value2 = 100;
			let value3 = new Date();
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('variables with no mutation', async () => {
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

		await assertSnapshot(print(program));
	});

	it('variables with mutation', async () => {
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

		await assertSnapshot(print(program));
	});

	it('unmutated variable referencing mutated variable', async () => {
		let program = parse(`
			let value1 = 100;
			let value2 = value1;

			value1 = 200;
			console.log(value1, value2);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable, referencing unmutated variable', async () => {
		let program = parse(`
			let value1 = 100;
			let value2 = value1;

			value2 = 200;
			console.log(value1, value2);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('variable mutation with logical assignment operators', async () => {
		let program = parse(`
			let value1 = 100;

			value1 ??= 200;
			value1 ||= 300;
			value1 &&= 300;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('unmutated variable accessing member property', async () => {
		let program = parse(`
			let state = { count: 0 };
			let current_date = new Date();

			console.log(state.count);
			console.log(current_date.toISOString());
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable accessing member property', async () => {
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
		await assertSnapshot(result);
	});

	it('unmutated variable mutating member property', async () => {
		let program = parse(`
			let state = { count: 0 };

			state.count += 1;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable mutating member property', async () => {
		let program = parse(`
			let state = { count: 0 };

			state = { count: 1 };
			console.log(state.count += 1);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('unmutated variable calling', async () => {
		let program = parse(`
			let call = () => 1;

			call();
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable calling', async () => {
		let program = parse(`
			let call = () => 1;

			call = () => 2;
			call();
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('prefix', async () => {
		let program = parse(`
			let count = 0;

			++count;
			--count;

			console.log(++count, ++count);

			function increment () {
				console.log(++count, ++count);
				return ++count;
			}

			let decrement = () => --count;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('postfix', async () => {
		let program = parse(`
			let count = 0;

			count++;
			count--;

			console.log(count++, count++);

			function increment () {
				console.log(count++, count++);
				return count++;
			}

			let decrement = () => count--;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable calling member property', async () => {
		let program = parse(`
			let today = new Date();
			let formatter = new Intl.DateTimeFormat();

			console.log('Today is ' + formatter.format(today));

			formatter = null;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('two variables on one declaration, one mutated', async () => {
		let program = parse(`
			let value1, value2;

			value1 = 100;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('two variables on one declaration, two mutated', async () => {
		let program = parse(`
			let value1, value2;

			value1 = 100;
			value2 = 200;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('variable mutated with spread', async () => {
		let program = parse(`
			let foo, bar, baz;

			({ foo, b: bar, buzz, c: car, ...baz } = obj);
			({ foo, b: bar, buzz, c: car, ...baz } = $obj);

			([foo, buzz, ...bar] = arr);
			([foo, buzz, ...bar] = $arr.foo);
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});
});

describe('prop', () => {
	it('unused properties', async () => {
		let program = parse(`
			export let value1;
			export let value2 = 100;
			export let value3 = new Date();
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('variables with no mutation', async () => {
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

		await assertSnapshot(print(program));
	});

	it('variables with mutation', async () => {
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

		await assertSnapshot(print(program));
	});

	it('variable referencing unmutated ref', async () => {
		let program = parse(`
			let value1 = 1;
			let value2 = () => {};
			export let value3 = value1;
			export let value4 = value2;
			export let value5 = value1 + value2;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('variable referencing mutated ref', async () => {
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
		await assertSnapshot(result);
	});

	it('handles separate export specifier', async () => {
		let program = parse(`
			let _count = 0;
			let foo = 1;

			export { _count as count, foo };
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('throws on exporting default', async () => {
		let source = `
			export default 123;
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('throws on one variable exported twice', async () => {
		let source = `
			let foo = 123;

			export { foo as bar, foo as baz };
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});
});

describe('computed', () => {
	it('unused variables', async () => {
		let program = parse(`
			$: value1;
			$: value2 = 100;
			$: value3 = new Date();
			foo: unrelated = 3;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variables', async () => {
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
		await assertSnapshot(result);
	});

	it('variable referencing unmutated ref', async () => {
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
		await assertSnapshot(result);
	});

	it('variable referencing mutated ref', async () => {
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
		await assertSnapshot(result);
	});

	it('mutating variable referencing unmutated ref', async () => {
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
		await assertSnapshot(result);
	});

	it('unmutated variable referencing unmutated ref member property', async () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;
			$: unrelated = value1.foo;

			console.log(value1, computed);
			console.log(unrelated);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('mutated variable referencing unmutated ref member property', async () => {
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
		await assertSnapshot(result);
	});

	it('unmutated variable referencing mutated ref member property', async () => {
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
		await assertSnapshot(result);
	});

	it('mutated variable referencing mutated ref member property', async () => {
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
		await assertSnapshot(result);
	});

	it('object spread from a store', async () => {
		let program = parse(`
			$: ({ scores, unknowns } = calculate($search_params.get('augments')?.split(',') || []));
			$: console.log({ scores, unknowns })
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});
});

describe('effect', () => {
	it('references unmutated refs', async () => {
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
		await assertSnapshot(result);
	});

	it('references mutated refs', async () => {
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
		await assertSnapshot(result);
	});

	it('only transform root scope', async () => {
		let program = parse(`
			let value = 0;
			value += 1;

			$: console.log(value);

			function increment () {
				$: console.log(value);
			}
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('handles direct statements', async () => {
		let program = parse(`
			let value = 0;
			let array = [];
			value += 1;
			array = [1, 2, 3];

			$: if (value % 2 === 0) console.log('odd!');
			$: for (let item of array) console.log(item);
			$: console.log(array);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});
});

describe('store', () => {
	it('getter', async () => {
		let program = parse(`
			$store;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('multiple getter references', async () => {
		let program = parse(`
			function increment () {
				console.log($value1);
			}

			console.log($value2);
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('setter', async () => {
		let program = parse(`
			$store = 123;
			$store ||= 123;
			$store++;
			--$store;
			$store *= 234;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('logical setter', async () => {
		let program = parse(`
			$store ??= 123;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('binary setter', async () => {
		let program = parse(`
			$store += 123;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('multiple setter references', async () => {
		let program = parse(`
			function increment () {
				$value1 += 1;
			}

			$value2 = 2;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('subscribing to a ref', async () => {
		let program = parse(`
			let value1;

			value1 = get_store();
			console.log($value1);
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('retrieving member property', async () => {
		let program = parse(`
			console.log($foo.bar);
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('mutating member property', async () => {
		let program = parse(`
			$foo.bar = 123;
		`);

		transform_script(program);

		await assertSnapshot(print(program));
	});

	it('throws on lone $', async () => {
		let source = `
			console.log($);
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('throws on declaring $ variables', async () => {
		let source = `
			let $foo = 'bar';
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('only alter single $', async () => {
		let program = parse(`
			console.log($foo, $$, $$$);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('no affecting inner scope', async () => {
		let program = parse(`
			function log () {
				let $bar = 123;
				console.log($bar, $foo);
			}

			console.log($foo);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('reference store twice', async () => {
		let program = parse(`
			console.log($foo, $foo);
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('getter within computed', async () => {
		let program = parse(`
			$: query = $searchParams.query;
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('lone block statement', async () => {
		let program = parse(`
			{ $foo; }
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});
});

describe('bind', () => {
	it('const and function exports', async () => {
		let program = parse(`
			export const magic = 420;

			export let open = false;

			export function toggle () {
				open = !open;
			}
		`);

		transform_script(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('separate export specifier', async () => {
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
		await assertSnapshot(result);
	});

	it('only one specifier for a bind', async () => {
		let source = `
			export const magic = 420;

			export { magic as MAGIC_NUMBER };
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});
});

describe('reserved', () => {
	it('throws on declaring $$', async () => {
		let source = `
			export let $$foo = 'bar';
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('throws on reassigning $$', async () => {
		let source = `
			$$root = null;
		`;

		let program = parse(source);

		try {
			transform_script(program, source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('can declare $$$ variables', async () => {
		let program = parse(`
			export let $$$foo = 123;
			let $$$bar = 333;
		`);

		assert.doesNotThrow(() => transform_script(program));

		let result = print(program);
		await assertSnapshot(result);
	});
});

describe('program finalizer', () => {
	it('props test', async () => {
		let program = parse(`
			export let count = -1;
			let magic = 420;

			export { magic as MAGIC };
		`);

		transform_script(program);
		finalize_program(program);

		let result = print(program);
		await assertSnapshot(result);
	});

	it('hoists imports', async () => {
		let program = parse(`
			import foo from 'foo';
			import { bar } from 'bar';

			console.log(bar);
		`);

		let { props_idx } = transform_script(program);
		finalize_template(program, null, props_idx, null);
		finalize_program(program);

		let result = print(program);
		await assertSnapshot(result);
	});
});
