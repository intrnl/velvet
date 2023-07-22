import { describe, expect, it } from 'bun:test';

import { compileSync, componentize } from '../src/compile.js';

describe('module context', () => {
	it('allow top level await', () => {
		let source = `
			<script context=module>
				let number = await Promise.resolve(420);
			</script>

			<div>the number is {number}</div>
		`;

		let result = compileSync(source);
		expect(result).toMatchSnapshot();
	});
});

describe('script context', () => {
	it('throws on await', () => {
		let source = `
			<script>
				let number = await Promise.resolve(123);
			</script>

			<div>the number is {number}</div>
		`;

		let has_error = false;
		let err;

		try {
			compileSync(source);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});
});

describe('options element', () => {
	it('allows for changing element name', () => {
		let source = `
			<v:options name='my-greeter' />
			<div>hello world!</div>
		`;

		let result = compileSync(source);
		expect(result).toMatchSnapshot();
	});

	it('throws on non root-level usage', () => {
		let source = `
			<div><v:options name='foo' /></div>
		`;

		let has_error = false;
		let err;

		try {
			compileSync(source);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});
});

describe('props', () => {
	it('throws on two variable exported to one name', () => {
		let source = `
			<script>
			let foo = 1;
			let bar = 2;

			export { foo as baz, bar as baz };
			</script>
		`;

		let has_error = false;
		let err;

		try {
			compileSync(source);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});

	it('exporting binding and mutable', () => {
		let template = `
			<script>
				export function greet () {
					alert('hello!');
				}

				const MAGIC_NUMBER = 420;
				export { MAGIC_NUMBER as magic };

				export let number = 1;
			</script>
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

describe('attribute', () => {
	it('binding checkbox group', () => {
		let template = `
			<script>
				let selected = ['Apple'];
			</script>

			<input type=checkbox value=Apple :group={selected} />
			<input type=checkbox value=Orange :group={selected} />
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('binding checkbox group nested', () => {
		let template = `
			<script>
				let state = {
					selected: ['Apple'],
				};

				state = {
					selected: ['Orange'],
				};
			</script>

			<input type=checkbox value=Apple :group={state.selected} />
			<input type=checkbox value=Orange :group={state.selected} />
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('throws on duplicate attributes', () => {
		let template = `
			<hello-world foo={123} foo={234}></hello-world>
		`;

		let has_error = false;
		let err;

		try {
			compileSync(template);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});

	it('allows duplicate #use attributes', () => {
		let template = `
			<time #use={relformatter} #use={[relformatter, { locale: 'en' }]}></time>
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

describe('store', () => {
	it('throws on lone $', () => {
		let source = `
			<script>
			console.log($);
			</script>
		`;

		let has_error = false;
		let err;

		try {
			compileSync(source);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});

	it('subscription on script and root', () => {
		let template = `
			<script>
			  console.log($foo);
			</script>

			{$foo}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on root and conditional', () => {
		let template = `
			{$foo}
			{#if foo}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on conditional', () => {
		let template = `
			{#if foo}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on conditional with log', () => {
		let template = `
			{#if foo}
				{$foo}
				{@log $foo}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on conditional and alternate', () => {
		let template = `
			{#if foo}
				{$foo}
			{:else}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on nested conditional', () => {
		let template = `
			{#if foo}
			  {$foo}
				{#if foo}
					{$foo}
				{/if}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on await resolve', () => {
		let template = `
			{#await promise then result}
				{$result}
			{/await}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on await pending and resolve', () => {
		let template = `
			{#await promise}
				{$foo}
			{:then foo}
				{$foo}
			{/await}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on root and await pending and resolve', () => {
		let template = `
			{#await promise}
				{$foo}
			{:then foo}
				{$foo}
			{/await}

			{$foo}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('subscription on conditional with let', () => {
		let template = `
			{#if show_favorite}
				{@let is_favorited = $favorite.favorited}
				{is_favorited}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

describe('element', () => {
	it('throws on improper closing tag', () => {
		let template = `<legend>Title</button>`;

		let has_error = false;
		let err;

		try {
			compileSync(template);
		}
		catch (error) {
			has_error = true;
			err = error;
		}

		expect(has_error).toBe(true);
		expect(err.toString()).toMatchSnapshot();
	});
});

describe('let expression', () => {
	it('unmutated referencing unmutated', () => {
		let template = `
			<script>
				let count = 0;
			</script>

			{#if foo}
				{@let doubled = count * 2}
				{count} {doubled}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('unmutated referencing mutated', () => {
		let template = `
			<script>
				let count = 0;
				count = 2;
			</script>

			{#if foo}
				{@let doubled = count * 2}
				{count} {doubled}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('mutated referencing unmutated', () => {
		let template = `
			<script>
				let count = 0;
			</script>

			{#if foo}
				{@let doubled = count * 2}
				{count} {doubled = 2}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('mutated referencing mutated', () => {
		let template = `
			<script>
				let count = 0;
				count = 2;
			</script>

			{#if foo}
				{@let doubled = count * 2}
				{count} {doubled = 2}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('referencing for each', () => {
		let template = `
			{#each Object.keys(data) as key}
				{@let item = data[key]}
				<option ?disabled={augments.includes(key)} value={key}>
					{item.name}
				</option>
			{/each}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

describe('conditional logic', () => {
	it('consequent', () => {
		let template = `
			{#if foo}
				<div>foo</div>
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('consequent and alternate', () => {
		let template = `
			{#if foo}
				<div>foo</div>
			{:else}
				<div>bar</div>
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

describe('style', () => {
	it('inline', () => {
		let template = `
			<style>.foo { color: red; }</style>
			<div class="foo">Hello</div>
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});

	it('imports', () => {
		let template = `
			<style>.foo { color: red; }</style>
			<div class="foo">Hello</div>
		`;

		let result = compileSync(template, {
			css: () => {
				return {
					css: '.foo { color: blue }',
					dependencies: ['./reset.css'],
				};
			},
		});

		expect(result).toMatchSnapshot();
	});
});

describe('peek', () => {
	it('allows peeking of @let variables', () => {
		let template = `
			<script>
				import { peek } from '@intrnl/velvet/macro';

				let count = 2;
				count = 3;
			</script>

			{@let doubled = count * 3}
			{peek(doubled)}

			{@let foo = 123}
			{peek(foo)}

			{#if count > 2}
				{@let tripled = count * 4}
				{peek(tripled)}

				{@let bar = 234}
				{peek(bar)}
			{/if}
		`;

		let result = compileSync(template);
		expect(result).toMatchSnapshot();
	});
});

it('componentize', () => {
	expect(componentize('foo.js', 'x')).toBe('x-foo');
	expect(componentize('HomePage.js', 'x')).toBe('x-home-page');
	expect(componentize('button group.js', 'x')).toBe('x-button-group');
});
