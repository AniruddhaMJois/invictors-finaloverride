import { db } from '@/server/db/database.js';
import { gameEngine } from '@/server/services/gameEngine.js';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await db.init();
      await gameEngine.loadFromDb();
      initialized = true;
    })();
  }
  await initPromise;
}
