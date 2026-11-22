import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function testSupabase() {
  console.log('\n========================================================');
  console.log('🧪 FINAL OVERRIDE — Supabase Connectivity Diagnostic');
  console.log('========================================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL;

  console.log('1. Checking Environment Variables in .env:');
  console.log(`   - SUPABASE_URL:             ${supabaseUrl ? '✅ Set (' + supabaseUrl + ')' : '❌ Missing'}`);
  console.log(`   - SUPABASE_KEY:             ${supabaseKey ? '✅ Set (' + supabaseKey.slice(0, 10) + '...)' : '❌ Missing'}`);
  console.log(`   - DATABASE_URL (Postgres):  ${dbUrl ? '✅ Set' : '⚠️ Not set (REST mode only)'}`);

  // 2. Test Supabase API Client
  if (supabaseUrl && supabaseKey) {
    console.log('\n2. Testing Supabase REST Client (@supabase/supabase-js)...');
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        realtime: { transport: ws }
      });
      const { data, error } = await supabase.from('settings').select('*').limit(5);

      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('   ⚠️ Supabase connected, but "settings" table is missing.');
          console.log('   👉 Please execute "supabase/schema.sql" in your Supabase SQL Editor:');
          console.log(`      ${supabaseUrl.replace('.supabase.co', '')}/sql (or Dashboard -> SQL Editor)`);
        } else {
          console.log('   ❌ Supabase query error:', error.message, error);
        }
      } else {
        console.log(`   ✅ Supabase connected successfully! Found ${data?.length || 0} settings entries:`, data);
      }
    } catch (err) {
      console.log('   ❌ Error initializing Supabase client:', err.message);
    }
  } else {
    console.log('\n2. Skipping Supabase REST Client test (SUPABASE_URL or key not provided in .env).');
  }

  // 3. Test PostgreSQL Direct Connection
  if (dbUrl) {
    console.log('\n3. Testing Direct PostgreSQL Pooler Connection...');
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const client = await pool.connect();
      const res = await client.query('SELECT NOW() as server_time, version() as pg_version');
      console.log('   ✅ PostgreSQL connected successfully!');
      console.log('   - Server Time:', res.rows[0].server_time);
      console.log('   - Version:', res.rows[0].pg_version.split(' ')[0], res.rows[0].pg_version.split(' ')[1]);
      client.release();
      await pool.end();
    } catch (err) {
      console.log('   ❌ Direct PostgreSQL connection failed:', err.message);
    }
  }

  console.log('\n========================================================\n');
}

testSupabase().catch(console.error);
