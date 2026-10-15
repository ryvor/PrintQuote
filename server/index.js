import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import {webcrypto, randomBytes} from 'node:crypto';
import nodemailer from 'nodemailer';
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
 'CREATE TABLE IF NOT EXISTS update_preferences (id INTEGER PRIMARY KEY CHECK(id=1), reminder_level TEXT NOT NULL DEFAULT "major", auto_update INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL)'])db.run(stmt);
const columns=allColumns();
function allColumns(){return db.exec('PRAGMA table_info(users)')[0]?.values.map(row=>row[1])||[]}
if(!columns.includes('email')){db.run('ALTER TABLE users ADD COLUMN email TEXT');persistMigration()}
function persistMigration(){const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,Buffer.from(db.export()),{mode:0o600});fs.renameSync(tmp,dbPath)}
function persist(){const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,Buffer.from(db.export()),{mode:0o600});fs.renameSync(tmp,dbPath)}
function one(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const row=stmt.step()?stmt.getAsObject():null;stmt.free();return row}
function all(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const rows=[];while(stmt.step())rows.push(stmt.getAsObject());stmt.free();return rows}
function run(sql,args=[]){db.run(sql,args);persist()}
if(!one('SELECT id FROM app_state WHERE id=1'))run('INSERT INTO app_state VALUES (1,?,?)',[JSON.stringify(defaults),new Date().toISOString()]);
if(!one('SELECT id FROM users LIMIT 1')){run('INSERT INTO users (id,username,first_name,last_name,role,password_hash,must_change_password) VALUES (?,?,?,?,?,?,?)',['admin','admin','Default','Administrator','admin',await hashPassword('admin'),1]);console.warn('Initial credentials admin/admin — change immediately before exposing publicly')}
async function authenticate(req,res,next){const token=(req.get('Authorization')||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return res.status(401).json({error:'Please sign in'});const u=one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',[await digest(token),new Date().toISOString()]);if(!u)return res.status(401).json({error:'Session expired'});req.user=u;req.token=token;next()}
function editorOnly(req,res,next){if(!['admin','manager','user'].includes(req.user.role))return res.status(403).json({error:'Read-only account'});next()}
function logActivity(actor,action){run('INSERT INTO activity_log(actor,action,created_at) VALUES(?,?,?)',[actor,action,new Date().toISOString()])}
function emailValid(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))&&String(value).length<=254}
function mailer(){if(!process.env.SMTP_HOST||!process.env.SMTP_FROM)throw Error('Email delivery is not configured. Set SMTP_HOST and SMTP_FROM first.');return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined})}
async function sendNotice(to,subject,body){await mailer().sendMail({from:process.env.SMTP_FROM,to,subject,text:body})}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Administrator access required'});next()}
app.get('/api/health',(_req,res)=>res.json({ok:true,storage:'sqlite'}));
app.post('/api/auth/login',async(req,res)=>{const {username,password,remember}=req.body||{};const user=one('SELECT * FROM users WHERE username=?',[String(username||'')]);if(!user||!await verifyPassword(String(password||''),user.password_hash))return res.status(401).json({error:'Invalid username or password'});const token=randomToken();run('INSERT INTO sessions VALUES (?,?,?)',[await digest(token),user.id,sessionExpiry(!!remember)]);res.json({token,user:publicUser(user)})});
app.get('/api/auth/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
app.post('/api/auth/logout',authenticate,async(req,res)=>{run('DELETE FROM sessions WHERE token_hash=?',[await digest(req.token)]);res.json({ok:true})});
app.post('/api/auth/password',authenticate,async(req,res)=>{const {currentPassword,newPassword}=req.body||{};if(!await verifyPassword(String(currentPassword||''),req.user.password_hash))return res.status(400).json({error:'Current password is incorrect'});if(!validPassword(newPassword))return res.status(400).json({error:'Password needs 6+ characters, one number and one special character'});run('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?',[await hashPassword(newPassword),req.user.id]);run('DELETE FROM sessions WHERE user_id=?',[req.user.id]);res.json({ok:true})});
app.get('/api/admin/users',authenticate,adminOnly,(_req,res)=>res.json({users:all('SELECT * FROM users ORDER BY username').map(publicUser)}));
app.post('/api/admin/users',authenticate,adminOnly,async(req,res)=>{const data=req.body||{},error=validateUser(data);if(error)return res.status(400).json({error});if(one('SELECT id FROM users WHERE username=?',[data.username]))return res.status(409).json({error:'Username already exists'});if(!emailValid(data.email))return res.status(400).json({error:'A valid email address is required'});if(one('SELECT id FROM users WHERE lower(email)=lower(?)',[data.email]))return res.status(409).json({error:'Email already in use'});const role=['user','admin'].includes(data.role)?data.role:'user';const id=randomToken().slice(0,24);try{await sendNotice(data.email,'Your PrintQuote account',`Hello ${data.firstName},\n\nYour PrintQuote account has been created. Username: ${data.username}\nPlease obtain your initial password securely from your administrator and change it after signing in.`)}catch(e){return res.status(503).json({error:'Email could not be delivered; account was not created: '+e.message})}run('INSERT INTO users (id,username,first_name,last_name,role,password_hash,must_change_password,email) VALUES (?,?,?,?,?,?,?,?)',[id,data.username,data.firstName.trim(),data.lastName.trim(),role,await hashPassword(data.password),0,data.email]);logActivity(req.user.username,'Created user '+data.username);res.status(201).json({ok:true})});
app.patch('/api/admin/users/:id',authenticate,adminOnly,async(req,res)=>{
 const old=one('SELECT * FROM users WHERE id=?',[req.params.id]);if(!old)return res.status(404).json({error:'User not found'});
 const d=req.body||{},username=String(d.username||'').trim(),firstName=String(d.firstName||'').trim(),lastName=String(d.lastName||'').trim(),email=String(d.email||'').trim(),role=String(d.role||'');
 if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)||!firstName||!lastName||!emailValid(email)||!['admin','user'].includes(role))return res.status(400).json({error:'Please provide a valid username, name, email and role'});
 if(old.id===req.user.id&&role!=='admin')return res.status(400).json({error:'You cannot remove your own administrator role'});
 if(one('SELECT id FROM users WHERE username=? AND id<>?',[username,old.id])||one('SELECT id FROM users WHERE lower(email)=lower(?) AND id<>?',[email,old.id]))return res.status(409).json({error:'Username or email already in use'});
 const changes=[];for(const [label,before,after] of [['username',old.username,username],['first name',old.first_name,firstName],['last name',old.last_name,lastName],['email',old.email||'',email],['role',old.role,role]])if(before!==after)changes.push(`${label}: ${before||'(not set)'} → ${after}`);
 if(!changes.length)return res.json({ok:true,unchanged:true});
 try{await sendNotice(email,'Your PrintQuote account was updated',`Hello ${firstName},\n\nAn administrator changed your PrintQuote account:\n${changes.join('\n')}\n\nIf you did not expect this, contact your administrator.`)}catch(e){return res.status(503).json({error:'Email delivery failed; no changes were saved: '+e.message})}
 run('UPDATE users SET username=?,first_name=?,last_name=?,email=?,role=? WHERE id=?',[username,firstName,lastName,email,role,old.id]);logActivity(req.user.username,'Updated account '+username+': '+changes.map(x=>x.split(':')[0]).join(', '));res.json({ok:true});
});
app.post('/api/admin/users/:id/reset-password',authenticate,adminOnly,async(req,res)=>{
 const user=one('SELECT * FROM users WHERE id=?',[req.params.id]);if(!user)return res.status(404).json({error:'User not found'});
 if(!emailValid(user.email))return res.status(400).json({error:'Set a valid email address for this user before resetting their password'});
 const password=randomBytes(24).toString('base64url')+'!7';const hash=await hashPassword(password);
 try{await sendNotice(user.email,'Your PrintQuote password has been reset',`Hello ${user.first_name},\n\nAn administrator reset your PrintQuote password.\nUsername: ${user.username}\nTemporary password: ${password}\n\nSign in and change your password immediately. If unexpected, contact your administrator.`)}catch(e){return res.status(503).json({error:'Password reset cancelled because email delivery failed: '+e.message})}
 run('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?',[hash,user.id]);run('DELETE FROM sessions WHERE user_id=?',[user.id]);logActivity(req.user.username,'Reset password for '+user.username);res.json({ok:true,message:'A new temporary password was emailed to the user. It is not available to administrators.'});
});
app.get('/api/admin/activity',authenticate,adminOnly,(_req,res)=>res.json({events:all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 100')}));
app.delete('/api/admin/users/:id',authenticate,adminOnly,(req,res)=>{if(req.params.id===req.user.id)return res.status(400).json({error:'Cannot delete your own account'});if(!one('SELECT id FROM users WHERE id=?',[req.params.id]))return res.status(404).json({error:'User not found'});run('DELETE FROM sessions WHERE user_id=?',[req.params.id]);run('DELETE FROM users WHERE id=?',[req.params.id]);res.json({ok:true})});
// Releases are operator-installed directories, never arbitrary URLs or uploaded scripts.
const releaseRoot=process.env.RELEASE_ROOT||'/releases';
const appVersion='2.2.2';
function versions(){
  try{return fs.readdirSync(releaseRoot,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^v\d+\.\d+\.\d+$/.test(x.name)).map(x=>{
    const dir=path.join(releaseRoot,x.name);
    const file=path.join(dir,'README.md');
    if(!fs.existsSync(path.join(dir,'docker-compose.yml'))||!fs.existsSync(file))return null;
    return {version:x.name.slice(1),readme:fs.readFileSync(file,'utf8').slice(0,60000)};
  }).filter(Boolean).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))}catch{return []}
}
// Shared deployment preferences are administrator-controlled and persisted in SQLite.
if(!one('SELECT id FROM update_preferences WHERE id=1'))run('INSERT INTO update_preferences(id,reminder_level,auto_update) VALUES (1,?,0)',['major']);
function semver(v){const m=/^(\d+)\.(\d+)\.(\d+)$/.exec(String(v));return m?m.slice(1).map(Number):null}
function compareVersions(a,b){const x=semver(a),y=semver(b);if(!x||!y)return 0;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0}
function eligibleVersion(candidate,current,level){const a=semver(candidate),b=semver(current);if(!a||!b||compareVersions(candidate,current)<=0)return false;const part={major:0,minor:1,patch:2}[level]??0;return a[part]>b[part]&&a.slice(0,part).every((n,i)=>n===b[i])}
app.get('/api/version',authenticate,(req,res)=>res.json({current:appVersion,updatedAt:one('SELECT created_at FROM release_schedule WHERE status=? AND version=? ORDER BY id DESC LIMIT 1',['completed',appVersion])?.created_at||null}));
app.patch('/api/admin/update-preferences',authenticate,adminOnly,(req,res)=>{
 const level=String(req.body?.reminderLevel||'');const auto=req.body?.autoUpdate;
 if(!['major','minor','patch'].includes(level)||typeof auto!=='boolean')return res.status(400).json({error:'Choose a valid reminder level and automatic update setting'});
 run('UPDATE update_preferences SET reminder_level=?,auto_update=? WHERE id=1',[level,auto?1:0]);logActivity(req.user.username,'Updated release preferences');res.json({ok:true,reminderLevel:level,autoUpdate:auto});
});
app.get('/api/admin/releases',authenticate,adminOnly,(req,res)=>{
 const list=versions(),latest=list[0]?.version||appVersion;
 const prefs=one('SELECT * FROM update_preferences WHERE id=1'),candidate=list.find(v=>eligibleVersion(v.version,appVersion,prefs.reminder_level))?.version||null;
 const dismissed=candidate&&!!one('SELECT user_id FROM update_notices WHERE user_id=? AND version=?',[req.user.id,candidate]);
 res.json({current:appVersion,releases:list,schedules:all('SELECT * FROM release_schedule ORDER BY id DESC LIMIT 30'),latest:candidate,showNotice:!!candidate&&!dismissed&&!prefs.auto_update,reminderLevel:prefs.reminder_level,autoUpdate:!!prefs.auto_update});
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
