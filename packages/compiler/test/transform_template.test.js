import * as assert from 'node:assert/strict';
import { describe, it } from 'mocha';

import { assertSnapshot } from './_utils/snapshot.js';

import { parse_template } from '../src/parse_template.js';
import { transform_template } from '../src/transform_template.js';
import { print } from '../src/utils/js_parse.js';


describe('attribute', () => {
	it('attribute quoted', () => {
		let template = `<div class='foo'></div>`;

		snap(template);
	});

	it('attribute unquoted', () => {
		let template = `<div class=foo></div>`;

		snap(template);
	});

	it('attribute quotations', () => {
		let template = `<div a="foo bar" sq="'" dq='"'></div>`;

		snap(template);
	});

	it('attribute expression', () => {
		let template = `<div class={className}></div>`;

		snap(template);
	});

	it.skip('attribute expression pure', () => {
		let template = `<div class={/* @static */ className}></div>`;

		snap(template);
	});

	it('attribute none', () => {
		let template = `<textarea readonly></textarea>`;

		snap(template);
	});

	it('fails on attribute with invalid expression', () => {
		let template = `<div class={.foo}></div>`;

		snap_parse_error(template);
	});

	it('handles attribute expression with parenthesis', () => {
		let template = `<div class={(((foo.bar)))}></div>`;

		snap(template);
	});


	it('boolean expression', () => {
		let template = `<textarea ?readonly={is_readonly}></textarea>`;

		snap(template);
	});

	it.skip('boolean expression pure', () => {
		let template = `<textarea ?readonly={/* @static */ is_readonly}></textarea>`;

		snap(template);
	});

	it('boolean none', () => {
		let template = `<textarea ?readonly></textarea>`;

		snap(template);
	});


	it('property expression', () => {
		let template = `<input .value={value}>`;

		snap(template);
	});

	it.skip('property expression pure', () => {
		let template = `<input .value={/* @static */ value}>`;

		snap(template);
	});

	it('property none', () => {
		let template = `<input .value>`;

		snap(template);
	});

	it('property checkbox group', () => {
		let template = `<input type=checkbox .group={selected}>`;

		snap(template);
	});

	it('property select value', () => {
		let template = `<select multiple .value={value}></select>`;

		snap(template);
	});


	it('event expression', () => {
		let template = `<button @click={handle_click}></button>`;

		snap(template);
	});


	it('binding expression', () => {
		let template = `<input :value={value}>`;

		snap(template);
	});

	it('binding member expression', () => {
		let template = `<input :value={foo.bar}>`;

		snap(template);
	});

	it('binding component expression', () => {
		let template = `<Component :foo={value} />`;

		snap(template);
	});

	it('binding checkbox expression', () => {
		let template = `<input type=checkbox :checked={value}>`;

		snap(template);
	});

	it('binding checkbox group', () => {
		let template = `<input type=checkbox :group={selected}>`;

		snap(template);
	});

	it('binding radio group', () => {
		let template = `<input type=radio :group={picked}>`;

		snap(template);
	})

	it('binding select value', () => {
		let template = `<select multiple :value={value}></select>`;

		snap(template);
	});

	it('binding input number', () => {
		let template = `<input type=number :value={value}>`;

		snap(template);
	});

	it('binding textarea value', () => {
		let template = `<textarea :value={content}></textarea>`;

		snap(template);
	});

	it('fails on binding with no value', () => {
		let template = `<input :value>`;

		snap_transform_error(template)
	});

	it('fails on binding with invalid expression', () => {
		let template = `<input :value={  foo()  }>`;

		snap_transform_error(template);
	});

	it('fails on binding with optional member expression', () => {
		let template = `<input :value={foo?.bar}>`;

		snap_transform_error(template);
	});


	it('ref expression', () => {
		let template = `<input #ref={input}>`;

		snap(template);
	});


	it('action expression', () => {
		let template = `<input #use={action}>`;

		snap(template);
	});

	it('action expression array', () => {
		let template = `<time #use={[relformatter]}></time>`;

		snap(template);
	});

	it('action expression array with options', () => {
		let template = `<time #use={[relformatter, { value: Date.now() }]}></time>`;

		snap(template);
	});

	it('throws on action expression array with nothing', () => {
		let template = `<time #use={[]}></time>`;

		snap_transform_error(template);
	});

	it('throws on action expression array with too many options', () => {
		let template = `<time #use={[a, b, c]}></time>`;

		snap_transform_error(template);
	});


	it('spread expression', () => {
		let template = `<input {...props}>`;

		snap(template);
	});

	it('ifdef attributes', () => {
		let template = `<a target?={target}></a>`;

		snap(template);
	});

	it('class object expression', () => {
		let template = `<div class={{ foo: true, bar: false, baz: baz, [computed]: true }}></div>`;

		snap(template);
	});

	it('style object expression', () => {
		let template = `<div style={{ color: 'red', background: bg, '--foo': null, '--baz': baz, [computed]: false }}></div>`;

		snap(template);
	});

	it('class object expression 2', () => {
		let template = `
			<li><a class={{ selected: visibility === 'all' }} href='#/'>All</a></li>
			<li><a class={{ selected: visibility === 'active' }} href='#/active'>Active</a></li>
			<li><a class={{ selected: visibility === 'completed' }} href='#/completed'>Completed</a></li>
		`;

		snap(template);
	});
});

describe('element', () => {
	it('selfclosing on a non-void element', () => {
		let template = `<button />`;

		snap(template);
	});

	it('v:element', () => {
		let template = `<v:element #this={Element}></v:element>`;

		snap(template);
	});

	it('v:element with children', () => {
		let template = `<v:element #this={Element}>Hello {name}!</v:element>`;

		snap(template);
	});

	it('multiple v:element', () => {
		let template = `<v:element #this={element}>Foo!</v:element><v:element #this={element}>Bar!</v:element>`;

		snap(template);
	});

	it('throws on improper closing tag', () => {
		let template = `<legend>Title</button>`;

		snap_parse_error(template);
	});

	it('whitespace on closing tag', () => {
		let template = `<button>Hello</button      >`;

		snap(template);
	});

	it('throws on script closing tag whitespace', () => {
		let template = `<script>console.log('hello')</script    >`;

		snap_parse_error(template);
	});
});

describe('component', () => {
	it('v:self on a custom element', () => {
		let template = `<x-app><v:self>hello world!</v:self></x-app>`;

		snap(template);
	});

	it('v:component', () => {
		let template = `<v:component #this={Component}></v:component>`;

		snap(template);
	});

	it('v:component with children', () => {
		let template = `<v:component #this={Component}>Hello {name}!</v:component>`;

		snap(template);
	});

	it('multiple component', () => {
		let template = `<Button>Button</Button><Button href='/'>Link Button</Button>`;

		snap(template);
	});

	it('multiple v:component', () => {
		let template = `<v:component #this={Button}>Button 1</v:component><v:component #this={Button}>Button 2</v:component>`;

		snap(template);
	});
});

describe('expression', () => {
	it('custom element', () => {
		let template = `<x-app>hello {name}!</x-app>`;

		snap(template);
	});

	it('component', () => {
		let template = `<Main>hello {name}!</Main>`;

		snap(template);
	});

	it('fails on invalid expression', () => {
		let template = `hello {name.}!`;

		snap_parse_error(template);
	});

	it('handles parenthesis', () => {
		let template = `<div>hello {((name))}!</div>`;

		snap(template);
	});

	it('multiple expressions', () => {
		let template = `<div>hello, {first_name} {last_name}!</div>`;

		snap(template);
	});
});

describe('named expression', () => {
	it('unknown named expression', () => {
		let template = `{@xyz foo}`;


		snap_transform_error(template);
	});
});

describe('log expression', () => {
	it('single', () => {
		let template = `{@log foo}`;

		snap(template);
	});

	it('multiple', () => {
		let template = `{@log foo, bar, baz}`;

		snap(template);
	});

	it('values', () => {
		let template = `{@log 'test', { foo, baz, baz }} {@log [foo, bar, baz]}`;

		snap(template);
	});

	it('in conditional', () => {
		let template = `{#if foo}{@log $$root, foo}{/if}`;

		snap(template);
	});

	it('in conditional with text', () => {
		let template = `{#if foo}{@log $$root, foo} Hello! {/if}`;

		snap(template);
	});
});

describe('let expression', () => {
	it('single', () => {
		let template = `{@let foo = 123}`;

		snap(template);
	});

	it('throws on incorrect definition', () => {
		let template1 = `{@let }`;
		let template2 = `{@let foo}`;
		let template3 = `{@let foo.bar = 123}`;

		snap_parse_error(template1);
		snap_parse_error(template2);
		snap_parse_error(template3);
	});
});

describe('conditional logic', () => {
	it('consequent', () => {
		let template = `{#if foo}<div>foo!</div>{/if}`;

		snap(template);
	});

	it('consequent and alternate', () => {
		let template = `{#if foo}<div>foo!</div>{:else}<div>bar!</div>{/if}`;

		snap(template);
	});

	it('consequent and alternate test', () => {
		let template = `{#if foo}<div>foo!</div>{:else if bar}<div>bar!</div>{/if}`;

		snap(template);
	});

	it('nested consequent', () => {
		let template = `{#if foo}<div>foo!</div>{#if bar}<div>bar!</div>{/if}{/if}`;

		snap(template);
	});

	it('conditional before expression', () => {
		let template = `
			{#if loading}
				Loading!
			{/if}

			<div>Hello, {name}!</div>
		`;

		snap(template);
	});

	it('conditional containing expression', () => {
		let template = `
			{#if person}
				{person.name}
			{/if}
		`;

		snap(template);
	});

	it('conditional containing two expressions', () => {
		let template = `
			{#if person}
				{person.first_name} {person.last_name}
			{/if}
		`;

		snap(template);
	});

	it('conditional containing component', () => {
		let template = `
			{#if person}
				<Button>Greet, {person.name}</Button>
			{/if}
		`;

		snap(template);
	});

	it('conditional containing v:component', () => {
		let template = `
			{#if person}
				<v:component #this={Button}>Greet, {person.name}</v:component>
			{/if}
		`;

		snap(template);
	});

	it('conditional containing v:element', () => {
		let template = `
			{#if person}
				<v:element #this={'button'}>Greet, {person.name}</v:element>
			{/if}
		`;

		snap(template);
	});

	it('conditional containing v:self', () => {
		let template = `
			{#if person}
				<v:self>Greetings, {person.name}!</v:self>
			{/if}
		`;

		snap(template);
	});

	it('conditional containing two elements', () => {
		let template = `
			{#if person}
				<div>{person.first_name}</div><div>{person.last_name}</div>
			{/if}
		`;

		snap(template);
	});

	it('conditional after static', () => {
		let template = `
			<div></div>

			{#if person}
				<div>hello {person.name}</div>
			{/if}
		`;

		snap(template);
	});

	it('conditional between static sandwich', () => {
		let template = `
			<div></div>

			{#if person}
				<div>hello {person.name}</div>
			{/if}

			<div>{person}</div>
		`;

		snap(template);
	});

	it('wraps svg elements properly', () => {
		let template = `
			<svg>
				{#if foo}
					<rect></rect>
				{/if}

				<foreignObject>
					{#if bar}
						<div></div>
					{/if}
				</foreignObject>
			</svg>
		`;

		snap(template);
	});
});

describe('loop logic', () => {
	it('iteration', () => {
		let template = `{#each array as person}<div>{person.first} - {person.last}</div>{/each}`

		snap(template);
	});

	it('index', () => {
		let template = `{#each array as person, index}<div>{index} - {person.name}</div>{/each}`

		snap(template);
	});

	it('loop after static', () => {
		let template = `
			<div></div>

			{#each array as person}
				<div>{person.name}</div>
			{/each}
		`;

		snap(template);
	});

	it('loop between static sandwich', () => {
		let template = `
			<div></div>

			{#each array as person}
				<div>{person.name}</div>
			{/each}

			<div>{array}</div>
		`;

		snap(template);
	});

	it('throw on more than two expression', () => {
		let template1 = `
			{#each array as person, index, foo}
				<div>{index} - {person.name}</div>
			{/each}
		`;

		snap_parse_error(template1);
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

		snap_parse_error(template1);
		snap_parse_error(template2);
	});
});

describe('await logic', () => {
	it('pending', () => {
		let template = `{#await promise}pending{/await}`;

		snap(template);
	});

	it('resolved', () => {
		let template = `{#await promise then}resolved{/await}`;

		snap(template);
	});

	it('resolved with local', () => {
		let template = `{#await promise then result}the number is {result.value}{/await}`;

		snap(template);
	});

	it('rejected', () => {
		let template = `{#await promise catch}rejected{/await}`;

		snap(template);
	});

	it('rejected with local', () => {
		let template = `{#await promise catch error}error: {error.message}{/await}`;

		snap(template);
	});

	it('pending and resolved', () => {
		let template = `{#await promise}pending{:then}resolved{/await}`;

		snap(template);
	});

	it('pending and resolved with local', () => {
		let template = `{#await promise}pending{:then name}hello, {name}!{/await}`;

		snap(template);
	});

	it('pending and rejected', () => {
		let template = `{#await promise}pending{:catch}rejected{/await}`;

		snap(template);
	});

	it('pending and rejected with local', () => {
		let template = `{#await promise}pending{:catch error}uh, oh! <pre>{error.message}</pre>{/await}`;

		snap(template);
	});

	it('await after static', () => {
		let template = `
			<div></div>

			{#await promise}
				<div>pending</div>
			{:then person}
				<div>{person.name}</div>
			{/await}
		`;

		snap(template);
	});

	it('await between static sandwich', () => {
		let template = `
			<div></div>

			{#await promise}
				<div>pending</div>
			{:then person}
				<div>{person.name}</div>
			{/await}

			<div>{promise}</div>
		`;

		snap(template);
	});
});

describe('keyed logic', () => {
	it('keyed', () => {
		let template = `{#key src}<img src={src} />{/key}`;

		snap(template);
	});

	it('keyed after static', () => {
		let template = `
			<div></div>

			{#key src}
				<img src={src} />
			{/key}
		`;

		snap(template);
	});

	it('keyed between static sandwich', () => {
		let template = `
			<div></div>

			{#key src}
				<img src={src} />
			{/key}

			<div>{src}</div>
		`;

		snap(template);
	});
});

describe('comment', () => {
	it('comment inbetween text', () => {
		let template = `foo  <!-- 1 -->  bar<!-- 2 -->  baz  <!-- 3 -->buzz<!-- 4 -->bazz`;

		snap(template);
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

		snap(template);
	});

	it('handles spacing between attributes', () => {
		let template = `<button style='display: none;' class='window' title='Greet'></button>`;

		snap(template);
	})

	it('handles html minification', () => {
		let template1 = ` <div> </div> <div> </div> `;
		let template2 = `<p>  The  quick  brown  fox  jumps  over  the  lazy  dog.  </p>`;
		let template3 = `<ul>   <li>A</li>   <li>B</li>   <li>C</li>  </ul>`;
		let template4 = `<p>   Hey, I <em>just</em> found   out about this <strong>cool</strong> website!   <sup>[1]</sup> </p>`;
		let template5 = `<div> x x <div></div> x x <div></div> x x </div>`;
		let template6 = ` <svg> <symbol id='icon' viewBox='0 0 20 20' fill='currentColor'> <path d='' /> </symbol> </svg> `;
		let template7 = `<input a='foo bar' b c>`;
		let template8 = `<svg><use href='icons.svg#refresh' /></svg>`;

		snap(template1);
		snap(template2);
		snap(template3);
		snap(template4);
		snap(template5);
		snap(template6);
		snap(template7);
		snap(template8);
	});
});

function snap (template) {
	let fragment = parse_template(template);
	let program = transform_template(fragment, template);

	assertSnapshot(print(program));
}

function snap_parse_error (template) {
	let has_error = false;
	let error = null;

	try {
		parse_template(template);
	}
	catch (err) {
		has_error = true;
		error = err;
	}

	assert.ok(has_error, `expected template parse to fail`);
	assertSnapshot(error.toString());
}

function snap_transform_error (template) {
	let has_error = false;
	let error = null;

	let fragment = parse_template(template);

	try {
		transform_template(fragment, template);
	}
	catch (err) {
		has_error = true;
		error = err;
	}

	assert.ok(has_error, `expected template transform to fail`);
	assertSnapshot(error.toString());
}
