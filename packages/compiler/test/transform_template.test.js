import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { assertSnapshot } from '@intrnl/node-jestlike-snapshots';

import { parse_template } from '../src/parse_template.js';
import { transform_template } from '../src/transform_template.js';
import { print } from '../src/utils/js_parse.js';


describe('attribute', () => {
	it('attribute quoted', () => {
		let template = `<div class='foo'></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('attribute unquoted', () => {
		let template = `<div class=foo></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('attribute quotations', () => {
		let template = `<div a="foo bar" sq="'" dq='"'></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('attribute expression', () => {
		let template = `<div class={className}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it.skip('attribute expression pure', () => {
		let template = `<div class={/* @static */ className}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('attribute none', () => {
		let template = `<textarea readonly></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('fails on attribute with invalid expression', () => {
		let template = `<div class={.foo}></div>`;

		try {
			parse_template(template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('handles attribute expression with parenthesis', () => {
		let template = `<div class={(((foo.bar)))}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});


	it('boolean expression', () => {
		let template = `<textarea ?readonly={is_readonly}></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it.skip('boolean expression pure', () => {
		let template = `<textarea ?readonly={/* @static */ is_readonly}></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('boolean none', () => {
		let template = `<textarea ?readonly></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});


	it('property expression', () => {
		let template = `<input .value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it.skip('property expression pure', () => {
		let template = `<input .value={/* @static */ value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('property none', () => {
		let template = `<input .value>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('property checkbox group', () => {
		let template = `<input type=checkbox .group={selected}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('property select value', () => {
		let template = `<select multiple .value={value}></select>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});


	it('event expression', () => {
		let template = `<button @click={handle_click}></button>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});


	it('binding expression', () => {
		let template = `<input :value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding member expression', () => {
		let template = `<input :value={foo.bar}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding component expression', () => {
		let template = `<Component :foo={value} />`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding checkbox expression', () => {
		let template = `<input type=checkbox :checked={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding checkbox group', () => {
		let template = `<input type=checkbox :group={selected}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding select value', () => {
		let template = `<select multiple :value={value}></select>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding input number', () => {
		let template = `<input type=number :value={value}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('binding textarea value', () => {
		let template = `<textarea :value={content}></textarea>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('fails on binding with no value', () => {
		let template = `<input :value>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('fails on binding with invalid expression', () => {
		let template = `<input :value={  foo()  }>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('fails on binding with optional member expression', () => {
		let template = `<input :value={foo?.bar}>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});


	it('ref expression', () => {
		let template = `<input #ref={input}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});


	it('action expression', () => {
		let template = `<input #use={action}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('action expression array', () => {
		let template = `<time #use={[relformatter]}></time>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('action expression array with options', () => {
		let template = `<time #use={[relformatter, { value: Date.now() }]}></time>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('throws on action expression array with nothing', () => {
		let template = `<time #use={[]}></time>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('throws on action expression array with too many options', () => {
		let template = `<time #use={[a, b, c]}></time>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});


	it('spread expression', () => {
		let template = `<input {...props}>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('ifdef attributes', () => {
		let template = `<a target?={target}></a>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('class object expression', () => {
		let template = `<div class={{ foo: true, bar: false, baz: baz, [computed]: true }}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('style object expression', () => {
		let template = `<div style={{ color: 'red', background: bg, '--foo': null, '--baz': baz, [computed]: false }}></div>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('class object expression 2', () => {
		let template = `
			<li><a class={{ selected: visibility === 'all' }} href='#/'>All</a></li>
			<li><a class={{ selected: visibility === 'active' }} href='#/active'>Active</a></li>
			<li><a class={{ selected: visibility === 'completed' }} href='#/completed'>Completed</a></li>
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('element', () => {
	it('selfclosing on a non-void element', () => {
		let template = `<button />`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('v:element', () => {
		let template = `<v:element #this={Element}></v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('v:element with children', () => {
		let template = `<v:element #this={Element}>Hello {name}!</v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('multiple v:element', () => {
		let template = `<v:element #this={element}>Foo!</v:element><v:element #this={element}>Bar!</v:element>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('throws on improper closing tag', () => {
		let template = `<legend>Title</button>`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('whitespace on closing tag', () => {
		let template = `<button>Hello</button      >`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('throws on script closing tag whitespace', () => {
		let template = `<script>console.log('hello')</script    >`;

		try {
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});
});

describe('component', () => {
	it('v:self on a custom element', () => {
		let template = `<x-app><v:self>hello world!</v:self></x-app>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('v:component', () => {
		let template = `<v:component #this={Component}></v:component>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('v:component with children', () => {
		let template = `<v:component #this={Component}>Hello {name}!</v:component>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('multiple component', () => {
		let template = `<Button>Button</Button><Button href='/'>Link Button</Button>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('multiple v:component', () => {
		let template = `<v:component #this={Button}>Button 1</v:component><v:component #this={Button}>Button 2</v:component>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('expression', () => {
	it('custom element', () => {
		let template = `<x-app>hello {name}!</x-app>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('component', () => {
		let template = `<Main>hello {name}!</Main>`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('fails on invalid expression', () => {
		let template = `hello {name.}!`;

		try {
			parse_template(template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('handles parenthesis', () => {
		let template = `hello {((name))}!`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('multiple expressions', () => {
		let template = `hello, {first_name} {last_name}!`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('named expression', () => {
	it('unknown named expression', () => {
		let template = `{@xyz foo}`;

		let fragment = parse_template(template);

		try {
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});
});

describe('log expression', () => {
	it('single', () => {
		let template = `{@log foo}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('multiple', () => {
		let template = `{@log foo, bar, baz}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('values', () => {
		let template = `{@log 'test', { foo, baz, baz }} {@log [foo, bar, baz]}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('in conditional', () => {
		let template = `{#if foo}{@log $$root, foo}{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('in conditional with text', () => {
		let template = `{#if foo}{@log $$root, foo} Hello! {/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('let expression', () => {
	it('single', () => {
		let template = `
			{@let foo = 123}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('throws on incorrect definition', () => {
		try {
			let template = `{@let }`;
			parse_template(template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}

		try {
			let template = `{@let foo}`;
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}

		try {
			let template = `{@let foo.bar = 123}`;
			let fragment = parse_template(template);
			transform_template(fragment, template);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});
});

describe('conditional logic', () => {
	it('consequent', () => {
		let template = `{#if foo}<div>foo!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('consequent and alternate', () => {
		let template = `{#if foo}<div>foo!</div>{:else}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('consequent and alternate test', () => {
		let template = `{#if foo}<div>foo!</div>{:else if bar}<div>bar!</div>{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('nested consequent', () => {
		let template = `{#if foo}<div>foo!</div>{#if bar}<div>bar!</div>{/if}{/if}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
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

		assertSnapshot(print(program));
	});

	it('conditional containing expression', () => {
		let template = `
			{#if person}
				{person.name}
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing two expressions', () => {
		let template = `
			{#if person}
				{person.first_name} {person.last_name}
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing component', () => {
		let template = `
			{#if person}
				<Button>Greet, {person.name}</Button>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing v:component', () => {
		let template = `
			{#if person}
				<v:component #this={Button}>Greet, {person.name}</v:component>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing v:element', () => {
		let template = `
			{#if person}
				<v:element #this={'button'}>Greet, {person.name}</v:element>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing v:self', () => {
		let template = `
			{#if person}
				<v:self>Greetings, {person.name}!</v:self>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('conditional containing two elements', () => {
		let template = `
			{#if person}
				<div>{person.first_name}</div><div>{person.last_name}</div>
			{/if}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('loop logic', () => {
	it('iteration', () => {
		let template = `{#each array as person}<div>{person.first} - {person.last}</div>{/each}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('index', () => {
		let template = `{#each array as person, index}<div>{index} - {person.name}</div>{/each}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('throw on more than two expression', () => {
		let template1 = `
			{#each array as person, index, foo}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		try {
			parse_template(template1);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});

	it('throw on non-identifier', () => {
		let template1 = `
			{#each array as 123}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		let template2 = `
			{#each array as (foo, 123)}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		try {
			parse_template(template1);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}

		try {
			parse_template(template2);
			assert.fail();
		}
		catch (error) {
			assertSnapshot(error.toString());
		}
	});
});

describe('await logic', () => {
	it('pending', () => {
		let template = `{#await promise}pending{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('resolved', () => {
		let template = `{#await promise then}resolved{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('resolved with local', () => {
		let template = `{#await promise then result}the number is {result.value}{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('rejected', () => {
		let template = `{#await promise catch}rejected{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('rejected with local', () => {
		let template = `{#await promise catch error}error: {error.message}{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('pending and resolved', () => {
		let template = `{#await promise}pending{:then}resolved{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('pending and resolved with local', () => {
		let template = `{#await promise}pending{:then name}hello, {name}!{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('pending and rejected', () => {
		let template = `{#await promise}pending{:catch}rejected{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});

	it('pending and rejected with local', () => {
		let template = `{#await promise}pending{:catch error}uh, oh! <pre>{error.message}</pre>{/await}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('keyed logic', () => {
	it('keyed', () => {
		let template = `{#key src}<img src={src} />{/key}`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('comment', () => {
	it('comment inbetween text', () => {
		let template = `foo  <!-- 1 -->  bar<!-- 2 -->  baz  <!-- 3 -->buzz<!-- 4 -->bazz`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});

describe('miscellaneous', () => {
	it('handles implicit table', () => {
		let template = `
			{#key 1}
				<table> <tr><td>{expr}</td></tr> </table>
			{/key}

			{#key 1}
				<table> <tr><td>{expr}</td></tr> <tbody></tbody> </table>
			{/key}

			{#key 1}
				<table> <tr><td>{expr}</td></tr> <tbody></tbody> <tr><td>{expr}</td></tr> </table>
			{/key}

			{#key 1}
				<table> <tbody></tbody> <tr><td>{expr}</td></tr> </table>
			{/key}
		`;

		let fragment = parse_template(template);
		let program = transform_template(fragment);

		assertSnapshot(print(program));
	});
});
