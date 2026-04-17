import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const { Client } = pg

const PROJECT_REF = 'qcohfohjihazivkforsj'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjb2hmb2hqaWhheml2a2ZvcnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjUwNywiZXhwIjoyMDg4ODUyNTA3fQ.uWkkflNhSjJBkLXeP_E3o1NxUVth3vh5Pgujlq1CN6Q'

const base = resolve('/Users/bigbear/reality crm/realestate-crm/supabase/migrations')
const targets = ['115', '116', '117', '118', '119', '120', '121']

const client = new Client({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: SERVICE_KEY,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

await client.connect()
console.log('✓ Connected to Supabase\n')

for (const prefix of targets) {
  const files = readdirSync(base).filter(f => f.startsWith(prefix + '_'))
  if (!files.length) { console.log(`SKIP: no file for ${prefix}`); continue }
  const file = files[0]
  const sql = readFileSync(resolve(base, file), 'utf8')
  process.stdout.write(`Running ${file}... `)
  try {
    await client.query(sql)
    console.log('✓')
  } catch (e) {
    console.log(`✗\n  Error: ${e.message.slice(0, 300)}`)
  }
}

await client.end()
console.log('\nDone.')
