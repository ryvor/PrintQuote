import {randomToken,digest,hashPassword,verifyPassword,publicUser,sessionExpiry,validateUser,validPassword} from '../../../shared/auth.js';
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const defaults={settings:{currency:'GBP',siteTitle:'PrintQuote',siteSubtitle:'PRINT COST STUDIO',accent:'#5277e8',energyRate:0.28,labourRate:12,defaultMargin:30,onboardingCompleted:false},filaments:[],printers:[],quotes:[],products:[],sales:[]};
export async function onRequest({request,env}){
 try{
  if(!env.DB)return response({error:'D1 binding DB is missing. Configure Cloudflare Pages D1 bindings.'},503);
  const db=env.DB,pathname=new URL(request.url).pathname,method=request.method;
  const first=await db.prepare('SELECT id FROM users LIMIT 1').first();
  // The D1 schema must be applied before first request (see README).
  if(!first){await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)').bind('admin','admin','Default','Administrator','admin',await hashPassword('admin'),1).run()}
  const saved=await db.prepare('SELECT id FROM app_state WHERE id=1').first();
  if(!saved)await db.prepare('INSERT INTO app_state VALUES (1,?,?)').bind(JSON.stringify(defaults),new Date().toISOString()).run();
  if(pathname==='/api/health')return response({ok:true,storage:'cloudflare-d1'});
  const body=method==='POST'||method==='PUT'?await request.json().catch(()=>({})):{};
  if(pathname==='/api/auth/login'&&method==='POST'){
   const u=await db.prepare('SELECT * FROM users WHERE username=?').bind(String(body.username||'')).first();
   if(!u||!await verifyPassword(String(body.password||''),u.password_hash))return response({error:'Invalid username or password'},401);
   const token=randomToken();await db.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await digest(token),u.id,sessionExpiry(!!body.remember)).run();return response({token,user:publicUser(u)});
  }
  const token=(request.headers.get('Authorization')||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)return response({error:'Please sign in'},401);
  const user=await db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),new Date().toISOString()).first();
  if(!user)return response({error:'Session expired'},401);
  if(pathname==='/api/auth/me'&&method==='GET')return response({user:publicUser(user)});
  if(pathname==='/api/auth/logout'&&method==='POST'){await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return response({ok:true})}
  if(pathname==='/api/auth/password'&&method==='POST'){
   if(!await verifyPassword(String(body.currentPassword||''),user.password_hash))return response({error:'Current password is incorrect'},400);
   if(!validPassword(body.newPassword))return response({error:'Password needs 6+ characters, one number and one special character'},400);
   await db.prepare('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?').bind(await hashPassword(body.newPassword),user.id).run();
   await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run();return response({ok:true});
  }
  if(pathname==='/api/state'&&method==='GET'){const row=await db.prepare('SELECT data FROM app_state WHERE id=1').first();return response(JSON.parse(row.data))}
  if(pathname==='/api/state'&&method==='PUT'){
   if(!body||!Array.isArray(body.filaments)||!Array.isArray(body.printers)||!Array.isArray(body.quotes)||!body.settings||typeof body.settings!=='object'||Array.isArray(body.settings))return response({error:'Invalid workspace data'},400);
   await db.prepare('UPDATE app_state SET data=?,updated_at=? WHERE id=1').bind(JSON.stringify(body),new Date().toISOString()).run();return response({ok:true});
  }
  if(pathname.startsWith('/api/admin/')){
   if(user.role!=='admin')return response({error:'Administrator access required'},403);
   if(pathname==='/api/admin/users'&&method==='GET'){const result=await db.prepare('SELECT * FROM users ORDER BY username').all();return response({users:result.results.map(publicUser)})}
   if(pathname==='/api/admin/users'&&method==='POST'){
    const error=validateUser(body);if(error)return response({error},400);
    if(await db.prepare('SELECT id FROM users WHERE username=?').bind(body.username).first())return response({error:'Username already exists'},409);
    await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)').bind(randomToken().slice(0,24),body.username,body.firstName.trim(),body.lastName.trim(),'user',await hashPassword(body.password),0).run();return response({ok:true},201);
   }
   const match=pathname.match(/^\/api\/admin\/users\/([a-z0-9]+)$/);
   if(match&&method==='DELETE'){
    if(match[1]===user.id)return response({error:'Cannot delete your own account'},400);
    await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(match[1]).run();await db.prepare('DELETE FROM users WHERE id=?').bind(match[1]).run();return response({ok:true});
   }
  }
  return response({error:'Not found'},404);
 }catch(e){console.error('PrintQuote D1 API error',e);return response({error:'Database unavailable or request failed'},500)}
}
