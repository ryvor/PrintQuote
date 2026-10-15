import express from 'express';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));

const dbPath = process.env.SQLITE_PATH || '/data/printquote.sqlite';
const defaults = {
  settings: {currency:'GBP',siteTitle:'PrintQuote',siteSubtitle:'PRINT COST STUDIO',logo:'',accent:'#6478f5',background:'#f7f8fb',darkBackground:'#11141c',themeMode:'auto',gridOpacity:0.2,gridSize:28,energyRate:0.28,labourRate:12,defaultMargin:30},
  filaments:[{id:'f1',name:'PLA Basic',brand:'Generic',material:'PLA',colour:'Slate Grey',price:18.99,url:''},{id:'f2',name:'PETG',brand:'Generic',material:'PETG',colour:'Black',price:22.5,url:''}],
  printers:[{id:'p1',name:'Bambu Lab P1S',technology:'FDM',power:120,setupMinutes:5,postMinutes:10,overheadRate:0.3}],
  quotes:[]
};

const SQL = await initSqlJs();
fs.mkdirSync(path.dirname(dbPath), {recursive:true});
const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
db.run('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL)');

function persist() {
  const temporary = `${dbPath}.tmp`;
  fs.writeFileSync(temporary, Buffer.from(db.export()), {mode:0o600});
  fs.renameSync(temporary, dbPath);
}
function getState() {
  const result = db.exec('SELECT data FROM app_state WHERE id = 1');
  return result.length ? JSON.parse(result[0].values[0][0]) : defaults;
}
if (!db.exec('SELECT id FROM app_state WHERE id = 1').length) {
  db.run('INSERT INTO app_state(id, data, updated_at) VALUES (1, ?, ?)', [JSON.stringify(defaults), new Date().toISOString()]);
  persist();
}

app.get('/api/health', (_req,res) => res.json({ok:true,storage:'sqlite'}));
app.get('/api/state', (_req,res) => {
  try {res.json(getState());}
  catch(err) {console.error(err);res.status(500).json({error:'Unable to read workspace'});}
});
app.put('/api/state', (req,res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.filaments) || !Array.isArray(data.printers) || !Array.isArray(data.quotes) || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
    return res.status(400).json({error:'Invalid workspace data'});
  }
  try {
    db.run('UPDATE app_state SET data = ?, updated_at = ? WHERE id = 1', [JSON.stringify(data),new Date().toISOString()]);
    persist();
    res.json({ok:true});
  } catch(err) {console.error(err);res.status(500).json({error:'Unable to save workspace'});}
});

app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log(`PrintQuote API ready; SQLite database at ${dbPath}`));
