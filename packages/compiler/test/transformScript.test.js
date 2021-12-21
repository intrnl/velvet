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
		console.log(value2);
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
