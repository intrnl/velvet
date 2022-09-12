import * as assert from 'node:assert/strict';

/**
 * @param {import('nanospy').Spy} spy
 * @param {number} times
 * @param {any[]} args
 */
export function assertSpy (spy, times, args) {
	assert.equal(spy.callCount, times, `expected spy to be called ${times} times`);

	if (args != undefined) {
		const calls = spy.calls[times - 1];
		assert.deepEqual(calls, args, `expected call arguments to match`);
	}
}
