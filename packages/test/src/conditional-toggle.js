//  <script>
//  	let show = false;
//
//  	function toggle () {
//  		show = !show;
//  	}
//  </script>
//
//  <button @click={toggle}>toggle</button>
//
//  {#if show}
//  	<div>foo</div>
//  	<div>baz</div>
//  {:else}
//  	<div>bar</div>
//  	<div>qux</div>
//  {/if}


import {
	define as __define,

	ref as __ref,
	access as __access,

	html as __html,
	clone as __clone,
	append as __append,
	after as __after,
	traverse as __traverse,
	on as __on,

	show as __show,
} from 'velvet/internal';


let $template1 = __html('<button>toggle</button> <!>');
let $template2 = __html('<div>Foo</div> <div>Bar</div><!>');
let $template3 = __html('<div>Baz</div> <div>Qux</div><!>');

function $setup ($root, $host) {
	let show = __ref(false);

	function toggle () {
		show(!show(__access));
	}

	/// TEMPLATE
	let $fragment1 = __clone($template1);
	let $marker1 = __traverse($fragment1, 1);
	let $child1 = __traverse($fragment1, 0);

	// <button @click={toggle}>
	__on($child1, 'click', toggle);

	// {#if show}
	let $block1 = ($root) => {
		let $fragment1 = __clone($template2);
		let $marker1 = __traverse($fragment1, 3);

		__after($fragment1, $root);
		return $marker1;
	};

	// {:else}
	let $block2 = ($root) => {
		let $fragment1 = __clone($template3);
		let $marker1 = __traverse($fragment1, 3);

		__after($fragment1, $root);
		return $marker1;
	};

	__show($marker1, () => {
		let $value = show(__access);
		return $value ? $block1 : $block2;
	});

	__append($fragment1, $root);
}

export default __define('x-app', $setup, {});
