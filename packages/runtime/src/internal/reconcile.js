// https://github.com/ryansolid/dom-expressions/blob/1c34eeb00a2f691382858c08dd1302d6af6fb79e/packages/dom-expressions/src/reconcile.js

/**
 * @param {Node} parent
 * @param {ChildNode[]} a
 * @param {ChildNode[]} b
 */
export function reconcile_dom (parent, a, b) {
	let b_length = b.length;
	let a_end = a.length;
	let b_end = b_length;
	let a_start = 0;
	let b_start = 0;

	let after = a[a_end - 1].nextSibling;

	let map = null;

	let node;
	let idx;

	while (a_start < a_end || b_start < b_end) {
		// common prefix
		if (a[a_start] === b[b_start]) {
			a_start++;
			b_start++;
			continue;
		}

		// common suffix
		while (a[a_end - 1] === b[b_end - 1]) {
			a_end--;
			b_end--;
		}

		// append
		if (a_end === a_start) {
			node = b_end < b_length
				? b_start
					? b[b_start - 1].nextSibling
					: b[b_end - b_start]
				: after;

			while (b_start < b_end) {
				parent.insertBefore(b[b_start++], node);
			}
		}
		// remove
		else if (b_end === b_start) {
			while (a_start < a_end) {
				if (!map || !map.has(a[a_start])) {
					a[a_start].remove();
				}
				a_start++;
			}
		}
		// swap backward
		else if (a[a_start] === b[b_end - 1] && b[b_start] === a[a_end - 1]) {
			node = a[--a_end].nextSibling;
			parent.insertBefore(b[b_start++], a[a_start++].nextSibling);
			parent.insertBefore(b[--b_end], node);

			a[a_end] = b[b_end];
			// fallback to map
		}
		else {
			if (!map) {
				map = new Map();
				let i = b_start;

				while (i < b_end) {
					map.set(b[i], i++);
				}
			}

			idx = map.get(a[a_start]);
			if (idx != null) {
				if (b_start < idx && idx < b_end) {
					let i = a_start,
						sequence = 1,
						t;

					while (++i < a_end && i < b_end) {
						if ((t = map.get(a[i])) == null || t !== idx + sequence) {
							break;
						}
						sequence++;
					}

					if (sequence > idx - b_start) {
						let node = a[a_start];
						while (b_start < idx) {
							parent.insertBefore(b[b_start++], node);
						}
					}
					else {
						parent.replaceChild(b[b_start++], a[a_start++]);
					}
				}
				else {
					a_start++;
				}
			}
			else {
				a[a_start++].remove();
			}
		}
	}
}
