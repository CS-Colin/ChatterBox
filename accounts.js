const {randomUUID} = require('node:crypto');
const validId = id => id === 'default' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
function normalizeAccounts(settings) {
  const seen = new Set();
  const accounts = (Array.isArray(settings.accounts) ? settings.accounts : []).filter(a => {
    if(!a || !validId(a.id) || seen.has(a.id)) return false;
    seen.add(a.id); return true;
  }).map(a => ({id:a.id,name:typeof a.name === 'string' && a.name.trim() ? a.name.trim().slice(0,40) : 'WhatsApp'}));
  // Always retain the original WhatsApp partition when upgrading older installs.
  if(!accounts.some(a => a.id === 'default')) accounts.unshift({id:'default',name:'Personal'});
  return {accounts,activeAccount:accounts.some(a => a.id === settings.activeAccount) ? settings.activeAccount : 'default'};
}
function partitionFor(id) {
  if(!validId(id)) throw new Error('Invalid account');
  return id === 'default' ? 'persist:whatsapp' : `persist:whatsapp-${id}`;
}
function newAccount(name) {
  if(typeof name !== 'string' || !name.trim() || name.trim().length > 40) throw new Error('Enter an account name of 1–40 characters.');
  return {id:randomUUID(),name:name.trim()};
}
module.exports = {normalizeAccounts,partitionFor,newAccount};
