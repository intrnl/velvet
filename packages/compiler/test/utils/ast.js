import * as red from 'code-red';


export function parse (source) {
	return red.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
}

export function print (source) {
	return red.print(source).code;
}
