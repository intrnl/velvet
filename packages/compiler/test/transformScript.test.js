import { expect } from 'chai';

import { transform_script } from '../src/transformScript.js';
import { parse, print } from './utils/ast.js';



it('ref: unused variables', () => {
	let program = parse(`
		let value1;
		let value2 = 100;
		let value3 = new Date();
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('ref: variables with no mutation', () => {
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

it('ref: variables with mutation', () => {
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

it('ref: unmutated variable referencing mutated variable', () => {
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

it('ref: mutated variable, referencing unmutated variable', () => {
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

it('ref: variable mutation with logical assignment operators', () => {
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

it('ref: unmutated variable accessing member property', () => {
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

it('ref: mutated variable accessing member property', () => {
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

it('ref: unmutated variable mutating member property', () => {
	let program = parse(`
		let state = { count: 0 };

		state.count += 1;
	`);

	transform_script(program);

	let result = print(program);
	expect(result).toMatchSnapshot();
});

it('ref: mutated variable mutating member property', () => {
	let program = parse(`
		let state = { count: 0 };

		state = { count: 1 };
		console.log(state.count += 1);
	`);

	transform_script(program);

	let result = print(program);
	expect(result).toMatchSnapshot();
});

it('prop: unused properties', () => {
	let program = parse(`
		export let value1;
		export let value2 = 100;
		export let value3 = new Date();
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('prop: variables with no mutation', () => {
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

it('prop: variables with mutation', () => {
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

it('store: store getter', () => {
	let program = parse(`
		$store;
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: multiple store getter references', () => {
	let program = parse(`
		function increment () {
			console.log($value1);
		}

		console.log($value2);
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: store setter', () => {
	let program = parse(`
		$store = 123;
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: multiple store setter references', () => {
	let program = parse(`
		function increment () {
			$value1 += 1;
		}

		$value2 = 2;
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: subscribing to a ref', () => {
	let program = parse(`
		let value1;

		value1 = get_store();
		console.log($value1);
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: retrieving member property', () => {
	let program = parse(`
		console.log($foo.bar);
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});

it('store: mutating member property', () => {
	let program = parse(`
		$foo.bar = 123;
	`);

	transform_script(program);
	expect(print(program)).toMatchSnapshot();
});
