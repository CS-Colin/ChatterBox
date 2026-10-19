const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const publicKey = fs.readFileSync(path.join(__dirname, 'public.pem'));
function verifyCode(code) {
  try {
    const parts = String(code).trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'CB1') return null;
    const payload = Buffer.from(parts[1], 'base64');
    if (!crypto.verify('RSA-SHA256', payload, publicKey, Buffer.from(parts[2], 'base64'))) return null;
    const value = JSON.parse(payload.toString('utf8'));
    if (value.app !== 'chatterbox' || value.v !== 1 || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60 || !/^[0-9a-f-]{36}$/.test(value.id)) return null;
    return value;
  } catch { return null; }
}
function readActivation(filename) {
  try {
    const bytes = fs.readFileSync(filename);
    const code = bytes[0] === 255 && bytes[1] === 254 ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8').replace(/^\uFEFF/, '');
    return verifyCode(code);
  } catch { return null; }
}
module.exports = {verifyCode,readActivation};
