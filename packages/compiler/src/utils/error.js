export class CompilerError extends Error {
	start;
	end;
	frame;
	source;

	toString () {
		if (!this.start) {
			return this.message;
		}

		return `${this.message} (${this.start.line}:${this.start.column})\n${this.frame}`;
	}
}

export function create_error (message, source, start = 0, end = start) {
	let error = new CompilerError(message);

	error.pos = start;

	if (source) {
		let start_pos = get_line_col(source, start);
		let end_pos = get_line_col(source, end);

		error.start = start_pos;
		error.end = end_pos;

		error.source = source;
		error.frame = get_code_frame(source, start_pos.line - 1, start_pos.column);
	}

	return error;
}

/**
 * @param {any} condition
 * @param {string} [message]
 * @returns {asserts condition}
 */
export function assert (condition, message) {
	if (process.env.NODE_ENV !== 'production' && !condition) {
		throw new Error(message || 'assertion failed');
	}
}

/**
 * @template T
 * @param {T} value
 * @returns {T extends undefined | null ? never : T}
 */
export function defined (value) {
	if (process.env.NODE_ENV !== 'production' && value == null) {
		throw new Error(`expected value to be defined`);
	}

	return value;
}

export function get_line_col (source, target) {
	let line = 1;
	let column = 0;

	for (let i = 0, l = source.length; i < l; i++) {
		let char = source[i];

		if (i >= target) {
			break;
		}

		if (char === '\n') {
			line++;
			column = 0;
		}
		else {
			column++;
		}
	}

	return { line, column };
}

export function get_code_frame (source, line, column) {
	let lines = source.split('\n');

	let frame_start = Math.max(0, line - 2);
	let frame_end = Math.min(line + 3, lines.length);

	let digit = `${frame_end + 1}`.length;

	let frame = lines.slice(frame_start, frame_end)
		.map((str, idx) => {
			const is_error_line = frame_start + idx === line;
			const line_num = String(idx + frame_start + 1).padStart(digit, ' ');

			if (is_error_line) {
				const indicator = ' '.repeat(digit + 2 + tabs_to_spaces(str.slice(0, column)).length) + '^';
				return `${line_num}: ${tabs_to_spaces(str)}\n${indicator}`;
			}

			return `${line_num}: ${tabs_to_spaces(str)}`;
		})
		.join('\n');

	return frame;
}

function tabs_to_spaces (str) {
	return str.replace(/^\t+/, (tabs) => '  '.repeat(tabs.length));
}
