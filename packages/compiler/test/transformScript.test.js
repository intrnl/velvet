import { expect } from 'chai';

import { transform_script } from '../src/transformScript.js';
import { parse, print } from '../src/utils/parse.js';


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
});

describe('computed', () => {
	it('unused variables', () => {
		let program = parse(`
			$: value1;
			$: value2 = 100;
			$: value3 = new Date();
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

			value1 = 1;
			value2 = 2;
			value3 = 3;
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

			console.log(value1, computed1);
			console.log(value2, computed2);
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

			value1 = 200;
			value2 = Date.now();

			console.log(value1, computed1);
			console.log(value2, computed2);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutating variable referencing unmutated ref', () => {
		let program = parse(`
			let value1 = 100;
			$: computed = value1;

			computed = 200;

			console.log(value1, computed);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable referencing unmutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;

			console.log(value1, computed);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable referencing unmutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;

			computed = 234;

			console.log(value1, computed);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('unmutated variable referencing mutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;

			value1 = { foo: 234 };

			console.log(value1, computed);
		`);

		transform_script(program);

		let result = print(program);
		expect(result).toMatchSnapshot();
	});

	it('mutated variable referencing mutated ref member property', () => {
		let program = parse(`
			let value1 = { foo: 123 };
			$: computed = value1.foo;

			value1 = { foo: 234 };
			computed = 345;

			console.log(value1, computed);
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
});
