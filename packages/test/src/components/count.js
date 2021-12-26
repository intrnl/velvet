import {
	define as __define,

	property as __property,
	access as __access,

	html as __html,
	clone as __clone,
	append as __append,
	traverse as __traverse,
	on as __on,

	text as __text,
} from 'velvet/internal';


let $template1 = __html('<div>count: <!></div><div> <button> increment</button><button> decrement</button></div>');;

function $setup ($root, $host) {
	let count = __property(0, -1);

	function increment () {
		count(count(__access) + 1);
	}

	function decrement () {
		count(count(__access) - 1);
	}

	//// TEMPLATE
	let $fragment1 = __clone($template1);
	let $marker1 = __traverse($fragment1, [0, 1]);
	let $child1 = __traverse($fragment1, [1, 1]);
	let $child2 = __traverse($fragment1, [1, 2]);

	// {count}
	__text($marker1, () => count(__access));

	// <button @click={increment}>
	__on($child1, 'click', increment);

	// <button @click={decrement}>
	__on($child2, 'click', decrement);

	__append($root, $fragment1);
}

export default __define('x-count', $setup, { count: 0 });
