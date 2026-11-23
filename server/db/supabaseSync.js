import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Supabase Synchronization Layer
 * Synchronizes in-memory game state with Supabase cloud database
 * allowing coordinator portals, admin portal, and player sessions
 * to coordinate across serverless and multi-instance deployments.
 */

export const supabaseSync = {
  isConfigured: () => isSupabaseConfigured && Boolean(supabase),

  // Pull all state from Supabase Cloud
  async loadAll() {
    if (!this.isConfigured()) return null;
    try {
      const [
        teamsRes,
        membersRes,
        progressRes,
        hintsRes,
        violationsRes,
        devicesRes,
        settingsRes,
        notesRes,
        stageDataRes,
        hintsRepoRes
      ] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('members').select('*'),
        supabase.from('progress').select('*'),
        supabase.from('hint_unlocks').select('*'),
        supabase.from('violations').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('notes').select('*'),
        supabase.from('stage_data').select('*'),
        supabase.from('hints').select('*')
      ]);

      if (teamsRes.error) {
        console.warn('⚠️ Supabase sync error loading teams:', teamsRes.error.message);
        return null;
      }

      return {
        teams: teamsRes.data || [],
        members: membersRes.data || [],
        progress: progressRes.data || [],
        hintUnlocks: hintsRes.data || [],
        violations: violationsRes.data || [],
        devices: devicesRes.data || [],
        settings: settingsRes.data || [],
        notes: notesRes.data || [],
        stageData: stageDataRes.data || [],
        hintsRepo: hintsRepoRes.data || []
      };
    } catch (err) {
      console.warn('⚠️ Supabase loadAll exception:', err.message);
      return null;
    }
  },

  async syncTeamRegister(team, members, deviceToken, leaderMemberId) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('teams').upsert({
        id: team.id,
        name: team.teamName,
        coordinator: team.coordinator,
        team_pin: team.teamPin,
        current_stage: team.currentStage || 1,
        is_completed: team.isCompleted || false,
        start_time: team.startTime,
        created_at: team.createdAt || Date.now(),
        is_paused: false,
        paused_at: 0,
        paused_accum_ms: 0,
        set_id: team.setId || team.set_id || 'A',
        team_number: team.teamNumber || team.team_number || null
      });

      if (members && members.length > 0) {
        const memberRows = members.map((m) => ({
          id: m.id,
          team_id: team.id,
          name: m.name,
          is_leader: Boolean(m.isLeader)
        }));
        await supabase.from('members').upsert(memberRows);
      }

      if (deviceToken && leaderMemberId) {
        await supabase.from('devices').upsert({
          token: deviceToken,
          team_id: team.id,
          member_id: leaderMemberId,
          bound_at: Date.now()
        });
      }

      await supabase.from('notes').upsert({
        team_id: team.id,
        text: ''
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncTeamRegister error:', err.message);
    }
  },

  async syncSubmitAnswer(teamId, stage, fragment, isCompleted, endTime, answer, ok, wrongAttempts, nextStage) {
    if (!this.isConfigured()) return;
    try {
      // Note: db.run already logs submissions into Supabase PostgreSQL directly to prevent duplicate rows.
      if (ok) {
        await supabase.from('progress').upsert({
          team_id: teamId,
          stage,
          fragment: fragment || '',
          solved_at: Date.now(),
          wrong_attempts: wrongAttempts || 0
        });

        await supabase.from('teams').update({
          current_stage: nextStage || stage,
          is_completed: Boolean(isCompleted),
          end_time: endTime || null
        }).eq('id', teamId);
      }
    } catch (err) {
      console.warn('⚠️ Supabase syncSubmitAnswer error:', err.message);
    }
  },

  async syncUnlockHint(teamId, stage, n, unlockedAt, expiresAt, penaltySeconds) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('hint_unlocks').upsert({
        team_id: teamId,
        stage,
        n,
        unlocked_at: unlockedAt,
        expires_at: expiresAt,
        penalty_seconds: penaltySeconds
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncUnlockHint error:', err.message);
    }
  },

  async syncViolation(teamId, at, penaltySeconds) {
    // Note: db.run already logs violations directly into Supabase PostgreSQL to prevent duplicate rows.
    return;
  },

  async syncStageData(teamId, stage, key, value) {
    if (!this.isConfigured()) return;
    try {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      await supabase.from('stage_data').upsert({
        team_id: teamId,
        stage,
        key,
        value: valStr
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncStageData error:', err.message);
    }
  },

  async syncNotes(teamId, text) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('notes').upsert({
        team_id: teamId,
        text,
        updated_at: Date.now()
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncNotes error:', err.message);
    }
  },

  async syncSettings(key, value) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('settings').upsert({
        key,
        value: String(value)
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncSettings error:', err.message);
    }
  },

  async syncTeamPause(teamId, isPaused, pausedAt, pausedAccumMs) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('teams').update({
        is_paused: Boolean(isPaused),
        paused_at: pausedAt || 0,
        paused_accum_ms: pausedAccumMs || 0
      }).eq('id', teamId);
    } catch (err) {
      console.warn('⚠️ Supabase syncTeamPause error:', err.message);
    }
  },

  async syncTeamRestart(teamId, startTime) {
    if (!this.isConfigured()) return;
    try {
      await Promise.all([
        supabase.from('progress').delete().eq('team_id', teamId),
        supabase.from('hint_unlocks').delete().eq('team_id', teamId),
        supabase.from('violations').delete().eq('team_id', teamId),
        supabase.from('submissions').delete().eq('team_id', teamId),
        supabase.from('stage_data').delete().eq('team_id', teamId),
        supabase.from('notes').update({ text: '' }).eq('team_id', teamId),
        supabase.from('teams').update({
          current_stage: 1,
          is_completed: false,
          start_time: startTime,
          end_time: null
        }).eq('id', teamId)
      ]);
    } catch (err) {
      console.warn('⚠️ Supabase syncTeamRestart error:', err.message);
    }
  },

  async syncWaivePenalty(vId) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('violations').update({ waived: true }).eq('id', vId);
    } catch (err) {
      console.warn('⚠️ Supabase syncWaivePenalty error:', err.message);
    }
  },

  async syncUnbindDevice(token) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('devices').delete().eq('token', token);
    } catch (err) {
      console.warn('⚠️ Supabase syncUnbindDevice error:', err.message);
    }
  },

  async syncAudit(at, actor, action, detail) {
    if (!this.isConfigured()) return;
    try {
      await supabase.from('audit').insert({
        at,
        actor,
        action,
        detail: typeof detail === 'string' ? detail : JSON.stringify(detail)
      });
    } catch (err) {
      console.warn('⚠️ Supabase syncAudit error:', err.message);
    }
  },

  async syncHintUpdate(stage, n, text, setId = 'A') {
    if (!this.isConfigured()) return;
    try {
      const sId = (setId || 'A').toUpperCase();
      const stg = parseInt(stage, 10);
      const num = parseInt(n, 10);
      const cleanText = (text || '').trim();
      const { error } = await supabase.from('hints').upsert(
        {
          set_id: sId,
          stage: stg,
          n: num,
          text: cleanText
        },
        { onConflict: 'set_id,stage,n' }
      );
      if (error) {
        console.warn('⚠️ Supabase REST syncHintUpdate warning:', error.message);
      } else {
        console.log(`⚡ Supabase REST syncHintUpdate: Set ${sId} Mission ${stg} Hint ${num} synced successfully`);
      }
    } catch (err) {
      console.warn('⚠️ Supabase syncHintUpdate error:', err.message);
    }
  },

  async wipeAllTeams() {
    if (!this.isConfigured()) return;
    try {
      // In Supabase, delete from teams cascades to members, devices, progress, hint_unlocks, violations, submissions, stage_data, notes
      await supabase.from('teams').delete().neq('id', -999);
      await supabase.from('audit').delete().neq('id', -999);
    } catch (err) {
      console.warn('⚠️ Supabase wipeAllTeams error:', err.message);
    }
  }
};
