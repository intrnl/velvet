import {
	define as __define,

	ref as __ref,
	effect as __effect,
	access as __access,

	html as __html,
	clone as __clone,
	traverse as __traverse,
	append as __append,
	replace as __replace,
	on as __on,

	text as __text,
} from 'velvet/internal';

import { onDestroy } from 'velvet';
import Count from './components/count.js';


let $style = `<style>:host{display:block;background-color:lightgray}</style>`;
let $template1 = __html(`<!><div>count: <!></div><label> <input type='checkbox' /> interval</label><div> <button> increment</button><button> decrement</button></div>${$style}`);

function $setup ($root, $host) {
	let value = __ref(0);

	let toggle = __ref(false);
	let interval = __ref();

	function increment () {
		value(value(__access) + 1);
	}

	function decrement () {
		value(value(__access) - 1);
	}

	__effect(() => {
		if (toggle(__access)) {
			interval(setInterval(increment, 1000), false);
		}
		else {
			clearInterval(interval(__access));
		}
	});

	onDestroy(() => clearInterval(interval(__access)));

	/// TEMPLATE
	let $fragment1 = __clone($template1);
	let $marker1 = __traverse($fragment1, 0);
	let $marker2 = __traverse($fragment1, 1, 1);
	let $child1 = new Count();
	let $child2 = __traverse($fragment1, 2, 1);
	let $child3 = __traverse($fragment1, 3, 1);
	let $child4 = __traverse($fragment1, 3, 2);

	// <Count />
	__replace($child1, $marker1);

	// <Count .count={value} />
	__effect(() => $child1.count = value(__access));

	// {count}
	__text($marker2, () => value(__access));

	// <input :checked={toggle} />
	let $binding1 = (event) => toggle(event.target.checked);
	__on($child2, 'input', $binding1);
	__effect(() => $child2.checked = toggle(__access));

	// <button @click={increment}>
	__on($child3, 'click', increment);

	// <button @click={decrement}>
	__on($child4, 'click', decrement);

	__append($fragment1, $root);
}

export default __define('x-app', $setup, {});
