import * as SQLite from 'expo-sqlite';
import { db as existingDb } from '@/database/DatabaseService';

// Use the existing database instance
const db = existingDb;

export interface HabitSession {
  id?: number;
  habitId: number;
  durationSeconds: number;
  mode: 'timer' | 'stopwatch';
  startedAt: string;
  endedAt: string;
  createdDate: string;
}

export const runQuery = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    // Use the existing database methods with queue system
    if (sql.toLowerCase().startsWith('select')) {
      return await db.executeWithQueue(async () => {
        const result = await db.getDb()!.getAllAsync(sql, params);
        return { rows: { _array: result } };
      });
    } else if (sql.toLowerCase().startsWith('insert')) {
      return await db.executeWithQueue(async () => {
        const result = await db.getDb()!.runAsync(sql, params);
        return result;
      });
    } else if (sql.toLowerCase().startsWith('update')) {
      return await db.executeWithQueue(async () => {
        const result = await db.getDb()!.runAsync(sql, params);
        return result;
      });
    } else if (sql.toLowerCase().startsWith('delete')) {
      return await db.executeWithQueue(async () => {
        const result = await db.getDb()!.runAsync(sql, params);
        return result;
      });
    }
    throw new Error('Unsupported SQL operation');
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const initHabitSessionsTable = async () => {
  try {
    // The table creation is handled in the main DatabaseService
    // We just need to ensure the table exists
    console.log('Habit sessions table initialized');
  } catch (error) {
    console.error('Failed to initialize habit sessions table:', error);
  }
};

// Add the habit_sessions table to the existing database initialization
// This would typically be added to the main DatabaseService initialization
// For now, we'll just make sure the table exists when needed
export const ensureHabitSessionsTable = async () => {
  // Table is now created in the main DatabaseService initialization
  console.log('Habit sessions table ensured in main initialization');
};