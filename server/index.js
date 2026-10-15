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
 'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)'])db.run(stmt);
function persist(){const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,Buffer.from(db.export()),{mode:0o600});fs.renameSync(tmp,dbPath)}
function one(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const row=stmt.step()?stmt.getAsObject():null;stmt.free();return row}
function all(sql,args=[]){const stmt=db.prepare(sql);stmt.bind(args);const rows=[];while(stmt.step())rows.push(stmt.getAsObject());stmt.free();return rows}
function run(sql,args=[]){db.run(sql,args);persist()}
if(!one('SELECT id FROM app_state WHERE id=1'))run('INSERT INTO app_state VALUES (1,?,?)',[JSON.stringify(defaults),new Date().toISOString()]);
if(!one('SELECT id FROM users LIMIT 1')){run('INSERT INTO users VALUES (?,?,?,?,?,?,?)',['admin','admin','Default','Administrator','admin',await hashPassword('admin'),1]);console.warn('Initial credentials admin/admin — change immediately before exposing publicly')}
async function authenticate(req,res,next){const token=(req.get('Authorization')||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return res.status(401).json({error:'Please sign in'});const u=one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',[await digest(token),new Date().toISOString()]);if(!u)return res.status(401).json({error:'Session expired'});req.user=u;req.token=token;next()}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Administrator access required'});next()}
app.get('/api/health',(_req,res)=>res.json({ok:true,storage:'sqlite'}));
app.post('/api/auth/login',async(req,res)=>{const {username,password,remember}=req.body||{};const user=one('SELECT * FROM users WHERE username=?',[String(username||'')]);if(!user||!await verifyPassword(String(password||''),user.password_hash))return res.status(401).json({error:'Invalid username or password'});const token=randomToken();run('INSERT INTO sessions VALUES (?,?,?)',[await digest(token),user.id,sessionExpiry(!!remember)]);res.json({token,user:publicUser(user)})});
app.get('/api/auth/me',authenticate,(req,res)=>res.json({user:publicUser(req.user)}));
app.post('/api/auth/logout',authenticate,async(req,res)=>{run('DELETE FROM sessions WHERE token_hash=?',[await digest(req.token)]);res.json({ok:true})});
app.post('/api/auth/password',authenticate,async(req,res)=>{const {currentPassword,newPassword}=req.body||{};if(!await verifyPassword(String(currentPassword||''),req.user.password_hash))return res.status(400).json({error:'Current password is incorrect'});if(!validPassword(newPassword))return res.status(400).json({error:'Password needs 6+ characters, one number and one special character'});run('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?',[await hashPassword(newPassword),req.user.id]);run('DELETE FROM sessions WHERE user_id=?',[req.user.id]);res.json({ok:true})});
app.get('/api/admin/users',authenticate,adminOnly,(_req,res)=>res.json({users:all('SELECT * FROM users ORDER BY username').map(publicUser)}));
app.post('/api/admin/users',authenticate,adminOnly,async(req,res)=>{const data=req.body||{},error=validateUser(data);if(error)return res.status(400).json({error});if(one('SELECT id FROM users WHERE username=?',[data.username]))return res.status(409).json({error:'Username already exists'});const id=randomToken().slice(0,24);run('INSERT INTO users VALUES (?,?,?,?,?,?,?)',[id,data.username,data.firstName.trim(),data.lastName.trim(),'user',await hashPassword(data.password),0]);res.status(201).json({ok:true})});
app.delete('/api/admin/users/:id',authenticate,adminOnly,(req,res)=>{if(req.params.id===req.user.id)return res.status(400).json({error:'Cannot delete your own account'});if(!one('SELECT id FROM users WHERE id=?',[req.params.id]))return res.status(404).json({error:'User not found'});run('DELETE FROM sessions WHERE user_id=?',[req.params.id]);run('DELETE FROM users WHERE id=?',[req.params.id]);res.json({ok:true})});
app.get('/api/state',authenticate,(_req,res)=>{try{res.json(JSON.parse(one('SELECT data FROM app_state WHERE id=1').data))}catch{res.status(500).json({error:'Unable to read workspace'})}});
app.put('/api/state',authenticate,(req,res)=>{const d=req.body;if(!d||!Array.isArray(d.filaments)||!Array.isArray(d.printers)||!Array.isArray(d.quotes)||!d.settings||typeof d.settings!=='object'||Array.isArray(d.settings))return res.status(400).json({error:'Invalid workspace data'});try{run('UPDATE app_state SET data=?,updated_at=? WHERE id=1',[JSON.stringify(d),new Date().toISOString()]);res.json({ok:true})}catch{res.status(500).json({error:'Unable to save workspace'})}});
app.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log(`PrintQuote API ready: ${dbPath}`));
