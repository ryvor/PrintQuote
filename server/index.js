import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {randomToken,digest,hashPassword,verifyPassword,publicUser,sessionExpiry,validateUser,validPassword} from '../shared/auth.js';
if(!globalThis.crypto) globalThis.crypto=webcrypto;
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'3mb'}));
app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next()});
const dbPath=process.env.SQLITE_PATH||'/data/printquote.sqlite';
const defaults={settings:{currency:'GBP',siteTitle:'PrintQuote',siteSubtitle:'PRINT COST STUDIO',logo:'',accent:'#5277e8',background:'#f3f7ff',darkBackground:'#1b283d',themeMode:'auto',energyRate:0.28,labourRate:12,defaultMargin:30,onboardingCompleted:false},filaments:[],printers:[],quotes:[],products:[],sales:[]};
const SQL=await initSqlJs();fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const db=fs.existsSync(dbPath)?new SQL.Database(fs.readFileSync(dbPath)):new SQL.Database();
for(const stmt of [
 'CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, updated_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, must_change_password INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS release_schedule (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT NOT NULL, execute_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT "pending", requested_by TEXT NOT NULL, created_at TEXT NOT NULL, error TEXT)',
 'CREATE TABLE IF NOT EXISTS update_notices (user_id TEXT NOT NULL, version TEXT NOT NULL, dismissed_at TEXT NOT NULL, PRIMARY KEY(user_id,version))',
 'CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL)'])db.run(stmt);
function persist(){const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,Buffer.from(db.export()),{mode:0o600});fs.renameSync(tmp,dbPath)}
function one(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const row=stmt.step()?stmt.getAsObject():null;stmt.free();return row}
function all(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const rows=[];while(stmt.step())rows.push(stmt.getAsObject());stmt.free();return rows}
function run(sql,args=[]){db.run(sql,args);persist()}
if(!one('SELECT id FROM app_state WHERE id=1'))run('INSERT INTO app_state VALUES (1,?,?)',[JSON.stringify(defaults),new Date().toISOString()]);
if(!one('SELECT id FROM users LIMIT 1')){run('INSERT INTO users VALUES (?,?,?,?,?,?,?)',['admin','admin','Default','Administrator','admin',await hashPassword('admin'),1]);console.warn('Initial credentials admin/admin — change immediately before exposing publicly')}
async function authenticate(req,res,next){const token=(req.get('Authorization')||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return res.status(401).json({error:'Please sign in'});const u=one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',[await digest(token),new Date().toISOString()]);if(!u)return res.status(401).json({error:'Session expired'});req.user=u;req.token=token;next()}
function editorOnly(req,res,next){if(!['admin','manager','user'].includes(req.user.role))return res.status(403).json({error:'Read-only account'});next()}
function logActivity(actor,action){run('INSERT INTO activity_log(actor,action,created_at) VALUES(?,?,?)',[actor,action,new Date().toISOString()])}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Administrator access required'});next()}
app.get('/api/health',(_req,res)=>res.json({ok:true,storage:'sqlite'}));
app.post('/api/auth/login',async(req,res)=>{const {username,password,remember}=req.body||{};const user=one('SELECT * FROM users WHERE username=?',[String(username||'')]);if(!user||!await verifyPassword(String(password||''),user.password_hash))return res.status(401).json({error:'Invalid username or password'});const token=randomToken();run('INSERT INTO sessions VALUES (?,?,?)',[await digest(token),user.id,sessionExpiry(!!remember)]);res.json({token,user:publicUser(user)})});
app.get('/api/auth/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
app.post('/api/auth/logout',authenticate,async(req,res)=>{run('DELETE FROM sessions WHERE token_hash=?',[await digest(req.token)]);res.json({ok:true})});
app.post('/api/auth/password',authenticate,async(req,res)=>{const {currentPassword,newPassword}=req.body||{};if(!await verifyPassword(String(currentPassword||''),req.user.password_hash))return res.status(400).json({error:'Current password is incorrect'});if(!validPassword(newPassword))return res.status(400).json({error:'Password needs 6+ characters, one number and one special character'});run('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?',[await hashPassword(newPassword),req.user.id]);run('DELETE FROM sessions WHERE user_id=?',[req.user.id]);res.json({ok:true})});
app.get('/api/admin/users',authenticate,adminOnly,(_req,res)=>res.json({users:all('SELECT * FROM users ORDER BY username').map(publicUser)}));
app.post('/api/admin/users',authenticate,adminOnly,async(req,res)=>{const data=req.body||{},error=validateUser(data);if(error)return res.status(400).json({error});if(one('SELECT id FROM users WHERE username=?',[data.username]))return res.status(409).json({error:'Username already exists'});const role=['user','admin'].includes(data.role)?data.role:'user';const id=randomToken().slice(0,24);run('INSERT INTO users VALUES (?,?,?,?,?,?,?)',[id,data.username,data.firstName.trim(),data.lastName.trim(),role,await hashPassword(data.password),0]);logActivity(req.user.username,'Created user '+data.username);res.status(201).json({ok:true})});
app.get('/api/admin/activity',authenticate,adminOnly,(_req,res)=>res.json({events:all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 100')}));
app.patch('/api/admin/users/:id/role',authenticate,adminOnly,(req,res)=>{const role=req.body?.role;if(!['admin','user'].includes(role))return res.status(400).json({error:'Invalid role'});if(req.params.id===req.user.id)return res.status(400).json({error:'Cannot change your own role'});if(!one('SELECT id FROM users WHERE id=?',[req.params.id]))return res.status(404).json({error:'User not found'});run('UPDATE users SET role=? WHERE id=?',[role,req.params.id]);logActivity(req.user.username,'Changed role to '+role);res.json({ok:true})});
app.delete('/api/admin/users/:id',authenticate,adminOnly,(req,res)=>{if(req.params.id===req.user.id)return res.status(400).json({error:'Cannot delete your own account'});if(!one('SELECT id FROM users WHERE id=?',[req.params.id]))return res.status(404).json({error:'User not found'});run('DELETE FROM sessions WHERE user_id=?',[req.params.id]);run('DELETE FROM users WHERE id=?',[req.params.id]);res.json({ok:true})});
// Releases are operator-installed directories, never arbitrary URLs or uploaded scripts.
const releaseRoot=process.env.RELEASE_ROOT||'/releases';
const appVersion='2.2.0';
function versions(){
  try{return fs.readdirSync(releaseRoot,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^v\d+\.\d+\.\d+$/.test(x.name)).map(x=>{
    const dir=path.join(releaseRoot,x.name);
    const file=path.join(dir,'README.md');
    if(!fs.existsSync(path.join(dir,'docker-compose.yml'))||!fs.existsSync(file))return null;
    return {version:x.name.slice(1),readme:fs.readFileSync(file,'utf8').slice(0,60000)};
  }).filter(Boolean).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))}catch{return []}
}
app.get('/api/admin/releases',authenticate,adminOnly,(req,res)=>{
 const list=versions(),latest=list[0]?.version||appVersion;
 const dismissed=!!one('SELECT user_id FROM update_notices WHERE user_id=? AND version=?',[req.user.id,latest]);
 res.json({current:appVersion,releases:list,schedules:all('SELECT * FROM release_schedule ORDER BY id DESC LIMIT 30'),latest,showNotice:latest!==appVersion&&!dismissed});
});
app.post('/api/admin/releases/dismiss',authenticate,adminOnly,(req,res)=>{
 const version=String(req.body?.version||'');if(!versions().some(v=>v.version===version))return res.status(400).json({error:'Unknown release'});
 run('INSERT OR REPLACE INTO update_notices VALUES (?,?,?)',[req.user.id,version,new Date().toISOString()]);res.json({ok:true});
});
app.post('/api/admin/releases/schedule',authenticate,adminOnly,(req,res)=>{
 const version=String(req.body?.version||''),raw=String(req.body?.executeAt||''),when=new Date(raw);
 if(!versions().some(v=>v.version===version))return res.status(400).json({error:'Release not installed on host'});
 if(!raw||!Number.isFinite(when.getTime())||when.getTime()<Date.now()-30000||when.getTime()>Date.now()+365*86400000)return res.status(400).json({error:'Choose a future time within one year'});
 run('INSERT INTO release_schedule(version,execute_at,status,requested_by,created_at) VALUES(?,?,?,?,?)',[version,when.toISOString(),'pending',req.user.username,new Date().toISOString()]);
 logActivity(req.user.username,'Scheduled deployment '+version);res.json({ok:true});
});
app.delete('/api/admin/releases/schedule/:id',authenticate,adminOnly,(req,res)=>{
 const id=Number(req.params.id),row=one('SELECT status FROM release_schedule WHERE id=?',[id]);
 if(!row||row.status!=='pending')return res.status(409).json({error:'Only pending schedules can be cancelled'});
 run('UPDATE release_schedule SET status=? WHERE id=?',['cancelled',id]);res.json({ok:true});
});
app.get('/api/state',authenticate,(_req,res)=>{try{res.json(JSON.parse(one('SELECT data FROM app_state WHERE id=1').data))}catch{res.status(500).json({error:'Unable to read workspace'})}});
app.put('/api/state',authenticate,editorOnly,(req,res)=>{const d=req.body;if(!d||!Array.isArray(d.filaments)||!Array.isArray(d.printers)||!Array.isArray(d.quotes)||!d.settings||typeof d.settings!=='object'||Array.isArray(d.settings))return res.status(400).json({error:'Invalid workspace data'});try{run('UPDATE app_state SET data=?,updated_at=? WHERE id=1',[JSON.stringify(d),new Date().toISOString()]);logActivity(req.user.username,'Updated workspace');res.json({ok:true})}catch{res.status(500).json({error:'Unable to save workspace'})}});
app.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log(`PrintQuote API ready: ${dbPath}`));
