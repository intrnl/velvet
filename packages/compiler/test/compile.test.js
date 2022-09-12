import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { assertSnapshot } from './utils.js';

import { compileSync, componentize } from '../src/compile.js';


describe('module context', () => {
	it('allow top level await', async () => {
		let source = `
			<script context=module>
				let number = await Promise.resolve(420);
			</script>

			<div>the number is {number}</div>
		`;

		let result = compileSync(source);
		await assertSnapshot(result);
	});
});

describe('script context', () => {
	it('throws on await', async () => {
		let source = `
			<script>
				let number = await Promise.resolve(123);
			</script>

			<div>the number is {number}</div>
		`;

		try {
			compileSync(source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});
});

describe('options element', () => {
	it('allows for changing element name', async () => {
		let source = `
			<v:options name='my-greeter' />
			<div>hello world!</div>
		`;

		let result = compileSync(source);
		await assertSnapshot(result);
	});

	it('throws on non root-level usage', async () => {
		let source = `
			<div><v:options name='foo' /></div>
		`;

		try {
			compileSync(source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});
});

describe('props', () => {
	it('throws on two variable exported to one name', async () => {
		let source = `
			<script>
			let foo = 1;
			let bar = 2;

			export { foo as baz, bar as baz };
			</script>
		`;

		try {
			compileSync(source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('exporting binding and mutable', async () => {
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
		await assertSnapshot(result);
	});
});

describe('attribute', () => {
	it('binding checkbox group', async () => {
		let template = `
			<script>
				let selected = ['Apple'];
			</script>

			<input type=checkbox value=Apple :group={selected} />
			<input type=checkbox value=Orange :group={selected} />
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('binding checkbox group nested', async () => {
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
		await assertSnapshot(result);
	});

	it('throws on duplicate attributes', async () => {
		let template = `
			<hello-world foo={123} foo={234}></hello-world>
		`;

		try {
			compileSync(template);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('allows duplicate #use attributes', async () => {
		let template = `
			<time #use={relformatter} #use={[relformatter, { locale: 'en' }]}></time>
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});
});

describe('store', () => {
	it('throws on lone $', async () => {
		let source = `
			<script>
			console.log($);
			</script>
		`;

		try {
			compileSync(source);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});

	it('subscription on script and root', async () => {
		let template = `
			<script>
			  console.log($foo);
			</script>

			{$foo}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on root and conditional', async () => {
		let template = `
			{$foo}
			{#if foo}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on conditional', async () => {
		let template = `
			{#if foo}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on conditional with log', async () => {
		let template = `
			{#if foo}
				{$foo}
				{@log $foo}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on conditional and alternate', async () => {
		let template = `
			{#if foo}
				{$foo}
			{:else}
				{$foo}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on nested conditional', async () => {
		let template = `
			{#if foo}
			  {$foo}
				{#if foo}
					{$foo}
				{/if}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on await resolve', async () => {
		let template = `
			{#await promise then result}
				{$result}
			{/await}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on await pending and resolve', async () => {
		let template = `
			{#await promise}
				{$foo}
			{:then foo}
				{$foo}
			{/await}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on root and await pending and resolve', async () => {
		let template = `
			{#await promise}
				{$foo}
			{:then foo}
				{$foo}
			{/await}

			{$foo}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('subscription on conditional with let', async () => {
		let template = `
			{#if show_favorite}
				{@let is_favorited = $favorite.favorited}
				{is_favorited}
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});
});

describe('element', () => {
	it('throws on improper closing tag', async () => {
		let template = `<legend>Title</button>`;

		try {
			compileSync(template);
			assert.fail();
		}
		catch (error) {
			await assertSnapshot(error.toString());
		}
	});
});

describe('let expression', () => {
	it('unmutated referencing unmutated', async () => {
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
		await assertSnapshot(result);
	});

	it('unmutated referencing mutated', async () => {
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
		await assertSnapshot(result);
	});

	it('mutated referencing unmutated', async () => {
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
		await assertSnapshot(result);
	});

	it('mutated referencing mutated', async () => {
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
		await assertSnapshot(result);
	});

	it('referencing for each', async () => {
		let template = `
			{#each Object.keys(data) as key}
				{@let item = data[key]}
				<option ?disabled={augments.includes(key)} value={key}>
					{item.name}
				</option>
			{/each}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});
});

describe('conditional logic', () => {
	it('consequent', async () => {
		let template = `
			{#if foo}
				<div>foo</div>
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('consequent and alternate', async () => {
		let template = `
			{#if foo}
				<div>foo</div>
			{:else}
				<div>bar</div>
			{/if}
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});
});

describe('style', () => {
	it('inline', async () => {
		let template = `
			<style>.foo { color: red; }</style>
			<div class="foo">Hello</div>
		`;

		let result = compileSync(template);
		await assertSnapshot(result);
	});

	it('imports', async () => {
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

		await assertSnapshot(result);
	});
});

it('componentize', () => {
	assert.equal(componentize('foo.js', 'x'), 'x-foo');
	assert.equal(componentize('HomePage.js', 'x'), 'x-home-page');
	assert.equal(componentize('button group.js', 'x'), 'x-button-group');
});
