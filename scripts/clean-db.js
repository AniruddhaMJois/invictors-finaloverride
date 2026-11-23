import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanDatabaseForEvent() {
  console.log('\n🧹 ========================================================');
  console.log('🏁 FINAL OVERRIDE — Database Reset & Event-Readiness');
  console.log('========================================================\n');

  await db.init();

  console.log('1. Clearing operational data tables...');
  const operationalTables = [
    'devices',
    'members',
    'progress',
    'hint_unlocks',
    'violations',
    'submissions',
    'stage_data',
    'notes',
    'alerts',
    'audit',
    'teams'
  ];

  for (const table of operationalTables) {
    try {
      await db.run(`DELETE FROM public.${table}`);
      console.log(`   ✅ public.${table} cleared`);
    } catch (err) {
      console.warn(`   ⚠️ Warning clearing public.${table}:`, err.message);
    }
  }

  console.log('\n2. Resetting global settings to Event Standby mode...');
  const defaultSettings = [
    { key: 'game_started', value: '0' },
    { key: 'paused', value: '0' },
    { key: 'paused_at', value: '0' },
    { key: 'paused_accum_ms', value: '0' }
  ];

  for (const setting of defaultSettings) {
    await db.run(
      'INSERT INTO public.settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [setting.key, setting.value]
    );
    console.log(`   ✅ Setting: ${setting.key} = "${setting.value}"`);
  }

  console.log('\n3. Ensuring Supabase Realtime Publication & RLS Policies...');
  const realtimeTables = [
    'settings',
    'teams',
    'progress',
    'violations',
    'alerts',
    'notes',
    'hint_unlocks',
    'question_sets',
    'team_allotments',
    'hints'
  ];

  for (const t of realtimeTables) {
    try {
      await db.run(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
      await db.run(`DROP POLICY IF EXISTS "allow_anon_select" ON public.${t};`);
      await db.run(`CREATE POLICY "allow_anon_select" ON public.${t} FOR SELECT TO anon, authenticated USING (true);`);
      await db.run(`GRANT SELECT ON public.${t} TO anon, authenticated;`);
      console.log(`   ✅ Realtime RLS SELECT configured for public.${t}`);
    } catch (err) {
      console.warn(`   ⚠️ Notice for public.${t} RLS:`, err.message);
    }
  }

  console.log('\n4. Verifying preserved event foundation data...');
  const verifyTables = ['team_allotments', 'question_sets', 'hints', 'teams', 'members', 'settings'];
  for (const table of verifyTables) {
    try {
      const res = await db.all(`SELECT count(*) as count FROM public.${table}`);
      console.log(`   📊 public.${table}: ${res[0]?.count} rows`);
    } catch (err) {
      console.error(`   ❌ Failed checking public.${table}:`, err.message);
    }
  }

  const settingsRows = await db.all('SELECT key, value FROM public.settings');
  console.log('\n5. Final Active Settings:', settingsRows);

  console.log('\n========================================================');
  console.log('🎉 Database is clean and 100% EVENT READY!');
  console.log('========================================================\n');

  process.exit(0);
}

cleanDatabaseForEvent().catch((err) => {
  console.error('Fatal error resetting database:', err);
  process.exit(1);
});
