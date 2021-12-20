export function html (fragment) {
	let node = document.createElement('template');
	node.innerHTML = fragment;

	return node;
}

export function clone (template) {
	/** @type {DocumentFragment} */
	let fragment = template.content.cloneNode(true);

	return fragment;
}


export function traverse (node, ...indices) {
	let ref = node;

	for (let index of indices) {
		ref = ref.childNodes[index];
	}

	return ref;
}


export function replace (node, ref) {
	ref.replaceWith(node);
}

export function append (node, ref) {
	ref.append(node);
}

export function after (node, ref) {
	ref.after(node);
}


export function remove (node) {
	node.remove();
}

export function remove_all (nodes) {
	for (let node of nodes) {
		remove(node);
	}
}

export function remove_parts (a, b) {
	remove_all(get_parts(a, b));
}

export function get_parts (a, b) {
	let nodes = [];
	let node = a;

	while (node) {
		nodes.push(node);

		if (node === b) {
			break;
		}

		node = node.nextSibling;
	}

	return nodes;
}


export function on (node, type, listener, options) {
	node.addEventListener(type, listener, options);
}
