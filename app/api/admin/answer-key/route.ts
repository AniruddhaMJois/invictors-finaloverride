import { NextResponse } from 'next/server';
import { db } from '@/server/db/database.js';
import { STAGE_ANSWERS } from '@/server/config/index.js';
import { gameEngine } from '@/server/services/gameEngine.js';
import { getAdminSession } from '@/lib/server/auth';
import { ensureInitialized } from '@/lib/server/init';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Default fallback reference data if database records are pending
const DEFAULT_SETS: Record<string, any> = {
  A: {
    setName: 'Set A — Cosmic Vault Alpha (Teams 01–06)',
    s1: 'NOVA',
    s2: '7K2',
    s2Phrase: 'AURORA',
    s3: 'ORBIT',
    s4: '91X',
    s4Stations: { '1': '9', '2': '1', '3': 'X' },
    s5: 'HEX82D',
    s5Hex: '48 45 58 38 32 44',
    s6: 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29'
  },
  B: {
    setName: 'Set B — Cyber Nexus Beta (Teams 07–12)',
    s1: 'LUNA',
    s2: '4M9',
    s2Phrase: 'CYPHER',
    s3: 'SOLAR',
    s4: '84Z',
    s4Stations: { '1': '8', '2': '4', '3': 'Z' },
    s5: 'CORE7F',
    s5Hex: '43 4f 52 45 37 46',
    s6: 'FO{84Z-4M9-CORE7F-RALOS-LUNA}#32'
  },
  C: {
    setName: 'Set C — Quantum Matrix Gamma (Teams 13–18)',
    s1: 'VEGA',
    s2: '3X8',
    s2Phrase: 'VORTEX',
    s3: 'TITAN',
    s4: '72Y',
    s4Stations: { '1': '7', '2': '2', '3': 'Y' },
    s5: 'BYTE9A',
    s5Hex: '42 59 54 45 39 41',
    s6: 'FO{72Y-3X8-BYTE9A-NATIT-VEGA}#29'
  },
  D: {
    setName: 'Set D — Hyperion Vector Delta (Teams 19–25)',
    s1: 'MARS',
    s2: '5P3',
    s2Phrase: 'NEBULA',
    s3: 'ZENITH',
    s4: '63K',
    s4Stations: { '1': '6', '2': '3', '3': 'K' },
    s5: 'BITS1E',
    s5Hex: '42 49 54 53 31 45',
    s6: 'FO{63K-5P3-BITS1E-HTINEZ-MARS}#18'
  },
  E: {
    setName: 'Set E — Demo Simulation Epsilon (DEMO Walkthrough)',
    s1: 'ECHO',
    s2: '2D5',
    s2Phrase: 'COSMOS',
    s3: 'ALPHA',
    s4: '57W',
    s4Stations: { '1': '5', '2': '7', '3': 'W' },
    s5: 'SYNC3C',
    s5Hex: '53 59 4e 43 33 43',
    s6: 'FO{57W-2D5-SYNC3C-AHPLA-ECHO}#22'
  }
};

function calculateChecksum(str: string): number {
  return str.split('').reduce((sum, ch) => {
    const n = parseInt(ch, 10);
    return isNaN(n) ? sum : sum + n;
  }, 0);
}

export async function GET(request: Request) {
  try {
    await ensureInitialized();
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Master Admin authentication required.' },
        { status: 401 }
      );
    }

    // Permanent security audit logging
    await gameEngine.logAudit('Admin', 'inspect_keys', 'Master Admin inspected live answer keys and computed formulas across all 5 challenge sets');

    // Query live challenge sets from Supabase
    let dbSets: any[] = [];
    try {
      dbSets = await db.all('SELECT * FROM question_sets ORDER BY set_id ASC');
    } catch (e: any) {
      console.warn('Could not query question_sets table, falling back to defaults:', e?.message);
    }

    const setsData: Record<string, any> = {};

    (['A', 'B', 'C', 'D', 'E'] as const).forEach((setId) => {
      const fallback = DEFAULT_SETS[setId];
      const row = dbSets.find((r) => r.set_id === setId) || {};

      const s1 = row.stage1_answer || fallback.s1;
      const s2 = row.stage2_answer || fallback.s2;
      const s2Phrase = row.stage2_phrase || fallback.s2Phrase;
      const s3 = row.stage3_answer || fallback.s3;
      const s4 = row.stage4_answer || fallback.s4;
      const s5 = row.stage5_answer || fallback.s5;
      const s5Hex = row.stage5_hex || fallback.s5Hex;

      let stations = fallback.s4Stations;
      if (row.stage4_stations) {
        stations = typeof row.stage4_stations === 'string'
          ? JSON.parse(row.stage4_stations)
          : row.stage4_stations;
      }

      const revS3 = s3.split('').reverse().join('');
      const synthesizedBody = `${s4}-${s2}-${s5}-${revS3}-${s1}`;
      const checksum = calculateChecksum(synthesizedBody);
      const s6 = row.stage6_answer || `FO{${synthesizedBody}}#${checksum}`;

      setsData[setId] = {
        name: row.set_name || fallback.setName,
        s1,
        s1Decoy: 'FREQ-ZETA9',
        s2,
        s2Phrase,
        s2Decoys: [s2Phrase, 'ZETA9'],
        s3,
        s3Rule: `Requires: "I am a ...", Stage 2 fragment code "${s2}", and secret word "${s2Phrase}"`,
        s3Decoy: 'ZETA9',
        s4,
        s4Stations: `Station 1: ${stations['1']} | Station 2: ${stations['2']} | Station 3: ${stations['3']}`,
        s5,
        s5Hex,
        s5Bus: `Column 1 (${s5Hex} → ${s5})`,
        s5Decoy: 'ZETA9',
        s6,
        s6Rule: `A-Z: ${s4} (CTF) + ${s2} (Dec) + ${s5} (Hex) + ${revS3} (AI Rev) + ${s1} (Sig) | Checksum: ${checksum}`
      };
    });

    const finishedVerifications: any[] = [];
    for (const team of gameEngine.teams.values()) {
      if (team.isCompleted && team.verificationCode) {
        finishedVerifications.push({
          teamId: team.id,
          teamName: team.teamName,
          setId: team.setId,
          startTime: team.startTime,
          endTime: team.endTime,
          verificationCode: team.verificationCode
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      revealedTo: 'Master Admin',
      sets: setsData,
      staticAnswers: STAGE_ANSWERS,
      finishedVerifications
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to inspect keys' }, { status: 500 });
  }
}
