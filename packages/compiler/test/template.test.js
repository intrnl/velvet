import { describe, it, expect } from 'vitest';

import { parse_template } from '../src/parse_template.js';
import { transform_template } from '../src/transform_template.js';
import { print } from '../src/utils/js_parse.js';


describe('attribute', () => {
	it('static', () => {
		let template = `<div class='foo'></div>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('static unquoted', () => {
		let template = `<div class=foo></div>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('dynamic', () => {
		let template = `<div class={className}></div>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('static boolean', () => {
		let template = `<textarea readonly></textarea>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('dynamic boolean', () => {
		let template = `<textarea ?readonly={is_readonly}></textarea>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('dynamic boolean no value', () => {
		let template = `<textarea ?readonly></textarea>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('property', () => {
		let template = `<input .value={value}>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('property no value', () => {
		let template = `<input .value>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('component', () => {
	it('v:self on a custom element', () => {
		let template = `<x-app><v:self>hello world!</v:self></x-app>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('expression', () => {
	it('custom element', () => {
		let template = `<x-app>hello {name}!</x-app>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('component', () => {
		let template = `<Main>hello {name}!</Main>`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('conditional logic', () => {
	it('consequent', () => {
		let template = `{#if foo}<div>foo!</div>{/if}`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('consequent and alternate', () => {
		let template = `{#if foo}<div>foo!</div>{:else}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('consequent and alternate test', () => {
		let template = `{#if foo}<div>foo!</div>{:else if bar}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('nested consequent', () => {
		let template = `{#if foo}<div>foo!</div>{#if bar}<div>bar!</div>{/if}{/if}`;

		let fragment = parse_template(template);
		expect(fragment).toMatchSnapshot();

		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});
