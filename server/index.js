import express from 'express';
import pg from 'pg';
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'2mb'}));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:8});
const defaults={settings:{currency:'GBP',siteTitle:'PrintQuote',siteSubtitle:'PRINT COST STUDIO',logo:'',accent:'#6478f5',background:'#f7f9ff',darkBackground:'#101827',themeMode:'auto',gridOpacity:0.2,gridSize:28,energyRate:0.28,labourRate:12,defaultMargin:30},filaments:[{id:'f1',name:'PLA Basic',brand:'Generic',material:'PLA',colour:'Slate Grey',price:18.99,url:''},{id:'f2',name:'PETG',brand:'Generic',material:'PETG',colour:'Black',price:22.5,url:''}],printers:[{id:'p1',name:'Bambu Lab P1S',technology:'FDM',power:120,setupMinutes:5,postMinutes:10,overheadRate:0.3}],quotes:[]};
async function init(){await pool.query('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id=1), data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())');await pool.query('INSERT INTO app_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING',[JSON.stringify(defaults)]);}
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true})}catch{res.status(503).json({error:'Database unavailable'})}});
app.get('/api/state',async(req,res)=>{try{const r=await pool.query('SELECT data FROM app_state WHERE id=1');res.json(r.rows[0]?.data??defaults)}catch(e){console.error(e);res.status(503).json({error:'Database unavailable'})}});
app.put('/api/state',async(req,res)=>{const d=req.body;if(!d||!Array.isArray(d.filaments)||!Array.isArray(d.printers)||!Array.isArray(d.quotes)||!d.settings||typeof d.settings!=='object'||Array.isArray(d.settings))return res.status(400).json({error:'Invalid workspace data'});try{await pool.query('UPDATE app_state SET data=$1::jsonb, updated_at=NOW() WHERE id=1',[JSON.stringify(d)]);res.json({ok:true})}catch(e){console.error(e);res.status(503).json({error:'Could not save'})}});
let attempts=0;async function start(){try{await init();app.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log('PrintQuote API listening'))}catch(e){console.error('Waiting for database:',e.message);if(++attempts<30)setTimeout(start,2000);else process.exit(1)}}start();
