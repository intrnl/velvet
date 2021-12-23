export const SKIP = Symbol('skip');
export const REMOVE = Symbol('remove');

export function walk (node, walker, parent, key, index = -1) {
	if (Array.isArray(node)) {
		for (let idx = 0; idx < node.length; idx++) {
			let child = node[idx];
			let ret = walk(child, walker, parent, key, idx);

			if (ret == null) {
				continue
			}
			else if (ret == REMOVE) {
				node.splice(idx--, 1);
			}
			else if (ret !== child) {
				node[idx] = ret;
			}
		}

		return node;
	}

	if (!node || typeof node !== 'object' || !node.type) {
		return node;
	}

	if (!node.path) {
		node.path = { parent };
	}

	if (walker.enter) {
		let ret = walker.enter(node, parent, key, index);

		if (ret == null) {
			// blank
		}
		else if (ret === SKIP) {
			return node;
		}
		else if (ret === REMOVE) {
			return REMOVE;
		}
		else if (ret !== node) {
			ret.path = node.path;
			node = ret;
		}
	}

	for (let k in node) {
		if (k === 'path') {
			continue;
		}

		let child = node[k];

		if (!child || typeof child !== 'object') {
			continue;
		}

		let ret = walk(child, walker, node, k);

		if (ret == null) {
			continue
		}
		else if (ret === REMOVE) {
			delete node[k];
		}
		else if (ret !== child) {
			node[k] = ret;
		}
	}

	if (walker.leave) {
		let ret = walker.leave(node, parent, key, index);

		if (ret == null || ret === SKIP) {
			// blank
		}
		else if (ret === REMOVE) {
			return REMOVE;
		}
		else if (ret !== node) {
			ret.path = node.path;
			node = ret;
		}
	}

	return node;
}

walk.skip = SKIP;
walk.remove = REMOVE;
