import { describe, it, expect } from 'vitest';

import { parse_template } from '../src/parse_template.js';
import { transform_template } from '../src/transform_template.js';
import { print } from '../src/utils/js_parse.js';


describe('attribute', () => {
	it('attribute unquoted', () => {
		let template = `<div class='foo'></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('attribute unquoted', () => {
		let template = `<div class=foo></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('attribute expression', () => {
		let template = `<div class={className}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('attribute expression pure', () => {
		let template = `<div class={/* @static */ className}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('attribute none', () => {
		let template = `<textarea readonly></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('boolean expression', () => {
		let template = `<textarea ?readonly={is_readonly}></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('boolean expression pure', () => {
		let template = `<textarea ?readonly={/* @static */ is_readonly}></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('boolean none', () => {
		let template = `<textarea ?readonly></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('property expression', () => {
		let template = `<input .value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('property expression pure', () => {
		let template = `<input .value={/* @static */ value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('property none', () => {
		let template = `<input .value>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('ref expression', () => {
		let template = `<input #ref={input}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('event expression', () => {
		let template = `<button @click={handle_click}></button>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('binding expression', () => {
		let template = `<input :value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('spread expression', () => {
		let template = `<input {...props}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('element', () => {
	it('selfclosing on a non-void element', () => {
		let template = `<button />`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('component', () => {
	it('v:self on a custom element', () => {
		let template = `<x-app><v:self>hello world!</v:self></x-app>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('v:component', () => {
		let template = `<v:component #this={Component}></v:component>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('v:component with children', () => {
		let template = `<v:component #this={Component}>Hello {name}!</v:component>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('expression', () => {
	it('custom element', () => {
		let template = `<x-app>hello {name}!</x-app>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('component', () => {
		let template = `<Main>hello {name}!</Main>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('named expression', () => {
	it('unknown named expression', () => {
		let template = `{@xyz foo}`;

		let fragment = parse_template(template);

		try {
			transform_template(fragment, template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});
});

describe('log expression', () => {
	it('single', () => {
		let template = `{@log foo}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple', () => {
		let template = `{@log foo, bar, baz}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('values', () => {
		let template = `{@log 'test', { foo, baz, baz }} {@log [foo, bar, baz]}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('in conditional', () => {
		let template = `{#if foo}{@log $$root, foo}{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('conditional logic', () => {
	it('consequent', () => {
		let template = `{#if foo}<div>foo!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('consequent and alternate', () => {
		let template = `{#if foo}<div>foo!</div>{:else}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('consequent and alternate test', () => {
		let template = `{#if foo}<div>foo!</div>{:else if bar}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('nested consequent', () => {
		let template = `{#if foo}<div>foo!</div>{#if bar}<div>bar!</div>{/if}{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});

describe('loop logic', () => {
	it('iteration', () => {
		let template = `{#each person of array}<div>{person.first} - {person.last}</div>{/each}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('index', () => {
		let template = `{#each person, index of array}<div>{index} - {person.name}</div>{/each}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('throw on more than two expression', () => {
		let template1 = `
			{#each person, index, foo of array}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		try {
			parse_template(template1);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});

	it('throw on non-identifier', () => {
		let template1 = `
			{#each 123 of array}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		let template2 = `
			{#each (foo, 123) of array}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		try {
			parse_template(template1);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}

		try {
			parse_template(template2);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});
});

describe('await logic', () => {
	it('pending', () => {
		let template = `{#await promise}pending{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('resolved', () => {
		let template = `{#await promise then}resolved{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('resolved with local', () => {
		let template = `{#await promise then result}the number is {result.value}{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('rejected', () => {
		let template = `{#await promise catch}rejected{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('rejected with local', () => {
		let template = `{#await promise catch error}error: {error.message}{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('pending and resolved', () => {
		let template = `{#await promise}pending{:then}resolved{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('pending and resolved with local', () => {
		let template = `{#await promise}pending{:then name}hello, {name}!{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('pending and rejected', () => {
		let template = `{#await promise}pending{:catch}rejected{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('pending and rejected with local', () => {
		let template = `{#await promise}pending{:catch error}uh, oh! <pre>{error.message}</pre>{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});
