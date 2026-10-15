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
const select=db.prepare('SELECT id,version FROM release_schedule WHERE status=? AND execute_at<=? ORDER BY id LIMIT 1');
select.bind(['pending',new Date().toISOString()]);
const job=select.step()?select.getAsObject():null;select.free();
if(!job){console.log('No scheduled deployment due');process.exit(0)}
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
update('completed');console.log('Deployed v'+job.version+'; backup '+backup);
