import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialized();
  const session = getAdminSession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Master Admin authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await gameEngine.logAudit('Admin', 'export_csv', 'Exported full team performance CSV');
  const csvData = gameEngine.generateCsvExport();

  return new Response(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="final_override_teams_${Date.now()}.csv"`
    }
  });
}
