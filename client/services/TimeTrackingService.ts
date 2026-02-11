import { format } from 'date-fns';
import { runQuery, ensureHabitSessionsTable } from './Database';

export interface HabitSession {
  id?: number;
  habitId: number;
  durationSeconds: number;
  mode: 'timer' | 'stopwatch';
  startedAt: string;
  endedAt: string;
  createdDate: string;
}

export const TimeTrackingService = {
  saveSession: async (session: HabitSession) => {
    try {
      await ensureHabitSessionsTable();
        
      const { habitId, durationSeconds, mode, startedAt, endedAt, createdDate } = session;
        
      const result = await runQuery(
        `INSERT INTO habit_sessions (habit_id, duration_seconds, mode, started_at, ended_at, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [habitId, durationSeconds, mode, startedAt, endedAt, createdDate]
      );
        
      console.log('Session saved successfully');
      return result;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error; // Re-throw to allow caller to handle
    }
  },
  
  getTodayTotalDuration: async (habitId: number): Promise<number> => {
    try {
      await ensureHabitSessionsTable();
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await runQuery(
        `SELECT SUM(duration_seconds) as total FROM habit_sessions WHERE habit_id = ? AND created_date = ?`,
        [habitId, today]
      );
      
      return result.rows._array[0]?.total || 0;
    } catch (error) {
      console.error('Failed to get today\'s total duration:', error);
      return 0;
    }
  },
  
  getSessionHistory: async (habitId: number, limit: number = 10): Promise<HabitSession[]> => {
    try {
      await ensureHabitSessionsTable();
      
      const result = await runQuery(
        `SELECT * FROM habit_sessions WHERE habit_id = ? ORDER BY created_date DESC LIMIT ?`,
        [habitId, limit]
      );
      
      return result.rows._array.map((row: any) => ({
        id: row.id,
        habitId: row.habit_id,
        durationSeconds: row.duration_seconds,
        mode: row.mode,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        createdDate: row.created_date
      }));
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }
};
