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

	let i;
	let il;
	let x;
	let j;

	for (i = 0, il = indices.length; i < il; i++) {
		x = indices[i];
		ref = ref.firstChild;

		for (j = 0; j < x; j++) {
			ref = ref.nextSibling;
		}
	}

	return ref;
}

export function replace (ref, node, adopt) {
	ref.replaceWith(node);

	if (adopt) {
		let children = ref.childNodes;
		let len = children.length;

		while (len--) {
			node.appendChild(children[0]);
		}
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
	let idx = 0;
	let len = nodes.length;

	for (; idx < len; idx++) {
		remove(nodes[idx]);
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

export function attr_ifdef (node, name, value) {
	let map = node.$ifd || (node.$ifd = {});
	let def = value != null;

	if (def) {
		attr(node, name, value);
	}
	else if (map[name]) {
		node.removeAttribute(name);
	}

	map[name] = def;
}

export function get_checked_values (array, value, checked) {
	// this could be an iterable, so we need to spread.
	array = [...array];

	if (checked) {
		array.push(value);
	}
	else {
		let index = array.indexOf(value);

		if (index > -1) {
			array.splice(index, 1);
		}
	}

	return array;
}

export function get_select_values (select) {
	let multiple = select.multiple;
	let array = [];

	for (let option of select.selectedOptions) {
		array.push(option.value);
	}

	return multiple ? array : array[0];
}

export function set_select_values (select, current) {
	let multiple = select.multiple;

	for (let option of select.options) {
		let selected = multiple ? current.includes(option.value) : (option.value === current);

		option.selected = selected;

		if (selected && !multiple) {
			return;
		}
	}
}
