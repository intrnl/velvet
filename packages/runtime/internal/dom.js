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

export function traverse (node, indices) {
	let ref = node;

	for (let index of indices) {
		ref = ref.childNodes[index];
	}

	return ref;
}

export function replace (ref, node, adopt) {
	ref.replaceWith(node);

	if (adopt) {
		node.append(...ref.childNodes);
	}
}

export function append (ref, node) {
	ref.append(node);
}

export function after (ref, node) {
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

export function toggle (node, name, value) {
	node.toggleAttribute(name, value);
}

export function attr (node, name, value) {
	node.setAttribute(name, value);
}
