// Run on the Docker host, NOT in the web/API container. Requires Node and server dependencies.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import initSqlJs from 'sql.js';
const root=process.env.PRINTQUOTE_ROOT||'/opt/PrintQuote';
const database=path.join(root,'data/printquote.sqlite');
const releases=path.join(root,'releases');
const SQL=await initSqlJs();
if(!fs.existsSync(database))throw Error('Database missing: '+database);
const db=new SQL.Database(fs.readFileSync(database));
function query(sql,args=[]){const s=db.prepare(sql);s.bind(args);const row=s.step()?s.getAsObject():null;s.free();return row}
const prefs=query('SELECT reminder_level,auto_update FROM update_preferences WHERE id=1')||{reminder_level:'major',auto_update:0};
function parse(v){const m=/^(\d+)\.(\d+)\.(\d+)$/.exec(v);return m?m.slice(1).map(Number):null}
function compare(a,b){const x=parse(a),y=parse(b);if(!x||!y)return 0;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0}
function eligible(a,b,level){const x=parse(a),y=parse(b),part={major:0,minor:1,patch:2}[level]??0;return x&&y&&compare(a,b)>0&&x[part]>y[part]&&x.slice(0,part).every((n,i)=>n===y[i])}
let job=query('SELECT id,version FROM release_schedule WHERE status=? AND execute_at<=? ORDER BY id LIMIT 1',['pending',new Date().toISOString()]);
if(!job&&prefs.auto_update){
 const currentFile=path.join(root,'current-version');
 const current=fs.existsSync(currentFile)?fs.readFileSync(currentFile,'utf8').trim():(process.env.PRINTQUOTE_CURRENT_VERSION||'2.2.2');
 const available=fs.readdirSync(releases,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^v\d+\.\d+\.\d+$/.test(x.name)).map(x=>x.name.slice(1)).filter(v=>eligible(v,current,prefs.reminder_level)&&fs.existsSync(path.join(releases,'v'+v,'docker-compose.yml'))&&fs.existsSync(path.join(releases,'v'+v,'README.md'))).sort((a,b)=>compare(b,a));
 if(available.length){const version=available[0];db.run('INSERT INTO release_schedule(version,execute_at,status,requested_by,created_at) VALUES (?,?,?,?,?)',[version,new Date().toISOString(),'pending','automatic updater',new Date().toISOString()]);job=query('SELECT id,version FROM release_schedule WHERE status=? ORDER BY id DESC LIMIT 1',['pending']);}
}
if(!job){console.log('No scheduled or eligible automatic deployment');process.exit(0)}
function persist(){const tmp=database+'.updater.tmp';fs.writeFileSync(tmp,Buffer.from(db.export()),{mode:0o600});fs.renameSync(tmp,database)}
function update(status,error=''){db.run('UPDATE release_schedule SET status=?,error=? WHERE id=?',[status,error,job.id]);persist()}
if(!/^\d+\.\d+\.\d+$/.test(job.version))throw Error('Invalid version');
const dir=path.join(releases,'v'+job.version);
if(!fs.existsSync(path.join(dir,'docker-compose.yml'))||!fs.existsSync(path.join(dir,'README.md'))){update('failed','Release files unavailable');process.exit(1)}
// Only execute release packages provisioned by the trusted host operator.
const backup=path.join(root,'data','printquote.before-v'+job.version+'-'+Date.now()+'.sqlite');
fs.copyFileSync(database,backup);
update('deploying');
const result=spawnSync('docker',['compose','-p','printquote','-f',path.join(dir,'docker-compose.yml'),'up','-d','--build','--remove-orphans'],{cwd:dir,stdio:'inherit',timeout:600000});
if(result.status!==0){update('failed','Docker Compose failed; database backup: '+backup);process.exit(1)}
update('completed');fs.writeFileSync(path.join(root,'current-version'),job.version+'\n');console.log('Deployed v'+job.version+'; backup '+backup);
