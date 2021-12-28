export class CompilerError extends Error {
	constructor (message, start, end) {
		super(`${message} (${start})`);
		this.start = start;
		this.end = end;
	}
}
