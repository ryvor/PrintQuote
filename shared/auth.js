// Web Crypto implementation works in Node 20+ and Cloudflare Workers.
const enc = new TextEncoder();
const b64 = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const hexBytes = hex => new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
export const randomToken = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))));
export const validPassword = p => typeof p === 'string' && p.length >= 6 && /\d/.test(p) && /[^a-zA-Z0-9]/.test(p);
export async function hashPassword(password, salt = b64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({name:'PBKDF2',salt:hexBytes(salt),iterations:210000,hash:'SHA-256'},key,256);
  return `pbkdf2$210000$${salt}$${b64(new Uint8Array(hash))}`;
}
export async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('pbkdf2$')) return false;
  const [method, iterations, salt, hash] = stored.split('$');
  if (method !== 'pbkdf2' || Number(iterations) !== 210000) return false;
  const derived = await hashPassword(password, salt);
  const a = enc.encode(derived), b = enc.encode(stored);
  let difference = a.length ^ b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) difference |= (a[i]||0)^(b[i]||0);
  return difference === 0;
}
export const publicUser = u => ({id:u.id,username:u.username,firstName:u.first_name,lastName:u.last_name,role:u.role,email:u.email||'',mustChangePassword:!!u.must_change_password});
export const sessionExpiry = remember => new Date(Date.now()+(remember?30:1)*86400000).toISOString();
export const validateUser = body => {
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(body.username||'')) return 'Username must be 3–40 letters, digits, dots, underscores or hyphens';
  if (!String(body.firstName||'').trim() || !String(body.lastName||'').trim()) return 'First and last name are required';
  if (!validPassword(body.password)) return 'Password needs 6+ characters, one number and one special character';
  return null;
};
