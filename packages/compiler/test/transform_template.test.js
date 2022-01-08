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

	it.skip('attribute expression pure', () => {
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

	it('fails on attribute with invalid expression', () => {
		let template = `<div class={.foo}></div>`;

		try {
			parse_template(template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});

	it('handles attribute expression with parenthesis', () => {
		let template = `<div class={(((foo.bar)))}></div>`;

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

	it.skip('boolean expression pure', () => {
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

	it.skip('property expression pure', () => {
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

	it('property checkbox group', () => {
		let template = `<input type=checkbox .group={selected}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('property select value', () => {
		let template = `<select multiple .value={value}></select>`;

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

	it('binding member expression', () => {
		let template = `<input :value={foo.bar}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('binding component expression', () => {
		let template = `<Component :foo={value} />`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('binding checkbox expression', () => {
		let template = `<input type=checkbox :value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('binding checkbox group', () => {
		let template = `<input type=checkbox :group={selected}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('binding select value', () => {
		let template = `<select multiple :value={value}></select>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('fails on binding with no value', () => {
		let template = `<input :value>`;

		try {
			let fragment = parse_template(template);
			let program = transform_template(fragment, template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});

	it('fails on binding with invalid expression', () => {
		let template = `<input :value={  foo()  }>`;

		try {
			let fragment = parse_template(template);
			let program = transform_template(fragment, template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});

	it('fails on binding with optional member expression', () => {
		let template = `<input :value={foo?.bar}>`;

		try {
			let fragment = parse_template(template);
			let program = transform_template(fragment, template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});


	it('ref expression', () => {
		let template = `<input #ref={input}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});


	it('action expression', () => {
		let template = `<input #use={action}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('action expression array', () => {
		let template = `<input #use={[foo, bar]}>`;

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

	it('v:element', () => {
		let template = `<v:element #this={Element}></v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('v:element with children', () => {
		let template = `<v:element #this={Element}>Hello {name}!</v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple v:element', () => {
		let template = `<v:element #this={element}>Foo!</v:element><v:element #this={element}>Bar!</v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('throws on improper closing tag', () => {
		let template = `<legend>Title</button>`;

		try {
			let fragment = parse_template(template);
			let program = transform_template(fragment);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
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

	it('multiple component', () => {
		let template = `<Button>Button</Button><Button href='/'>Link Button</Button>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple v:component', () => {
		let template = `<v:component #this={Button}>Button 1</v:component><v:component #this={Button}>Button 2</v:component>`;

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

	it('fails on invalid expression', () => {
		let template = `hello {name.}!`;

		try {
			parse_template(template);
			expect.fail();
		}
		catch (error) {
			expect(error.toString()).toMatchSnapshot();
		}
	});

	it('handles parenthesis', () => {
		let template = `hello {((name))}!`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('multiple expressions', () => {
		let template = `hello, {first_name} {last_name}!`;

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

	it('conditional before expression', () => {
		let template = `
			{#if loading}
				Loading!
			{/if}

			<div>Hello, {name}!</div>
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing expression', () => {
		let template = `
			{#if person}
				{person.first_name} {person.last_name}
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing component', () => {
		let template = `
			{#if person}
				<Button>Greet, {person.name}</Button>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing v:component', () => {
		let template = `
			{#if person}
				<v:component #this={Button}>Greet, {person.name}</v:component>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing v:element', () => {
		let template = `
			{#if person}
				<v:element #this={'button'}>Greet, {person.name}</v:element>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing v:self', () => {
		let template = `
			{#if person}
				<v:self>Greetings, {person.name}!</v:self>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});

	it('conditional containing two elements', () => {
		let template = `
			{#if person}
				<div>{person.first_name}</div><div>{person.last_name}</div>
			{/if}
		`;

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

describe('comment', () => {
	it('comment inbetween text', () => {
		let template = `foo  <!-- 1 -->  bar  <!-- 2 -->  baz`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		expect(print(program)).toMatchSnapshot();
	});
});
