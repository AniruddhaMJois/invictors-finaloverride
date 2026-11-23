import app, { start } from '../server/server.js';
import { db } from '../server/db/database.js';
import { gameEngine } from '../server/services/gameEngine.js';

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    try {
      await db.init();
      await gameEngine.loadFromDb();
      initialized = true;
    } catch (err) {
      console.error('Database initialization error in serverless function:', err);
    }
  }

  return app(req, res);
}
