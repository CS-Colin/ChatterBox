const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeAccounts,partitionFor,newAccount} = require('./accounts');
test('upgrade retains the original WhatsApp login',()=>{
  const state=normalizeAccounts({githubRepo:'CS-Colin/ChatterBox'});
  assert.equal(state.activeAccount,'default');
  assert.equal(partitionFor(state.accounts[0].id),'persist:whatsapp');
});
test('accounts remain isolated and keep their partition when renamed or restored',()=>{
  const a=newAccount('Work'),b=newAccount('Family');
  assert.notEqual(partitionFor(a.id),partitionFor(b.id));
  const restored=normalizeAccounts(JSON.parse(JSON.stringify({accounts:[a,b],activeAccount:b.id})));
  assert.equal(restored.activeAccount,b.id);
  assert.equal(partitionFor({...a,name:'Business'}.id),partitionFor(a.id));
  assert.equal(restored.accounts.length,3);
});
test('invalid profiles cannot select another partition',()=>{
  const state=normalizeAccounts({accounts:[{id:'../../other',name:'x'},{id:'default',name:'A'},{id:'default',name:'B'}],activeAccount:'missing'});
  assert.deepEqual(state,{accounts:[{id:'default',name:'A'}],activeAccount:'default'});
  assert.throws(()=>partitionFor('../other'));
  assert.throws(()=>newAccount(' '));
  assert.throws(()=>newAccount('x'.repeat(41)));
});
