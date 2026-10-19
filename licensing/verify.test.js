const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyCode} = require('./verify');
test('reject malformed, unsigned, and forged invitations', () => {
  for(const code of ['', 'CB1', 'CB1.e30=.ZmFrZQ==', 'CB2.e30=.ZmFrZQ==']) assert.equal(verifyCode(code),null);
});
