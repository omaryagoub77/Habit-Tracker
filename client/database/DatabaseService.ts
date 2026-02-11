  import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Fallback for setImmediate in React Native
const setImmediateFallback = (callback: () => void) => {
  return setTimeout(callback, 0);
};

const setImmediate = global.setImmediate || setImmediateFallback;

const isWeb = Platform.OS === 'web';

// Type definitions
export interface Habit {
  id: number;
  name: string;
  timeSection: 'morning' | 'midday' | 'evening' | 'night';
  icon: string;
  color: string;
  reminderTime?: string;
  // Daily time goal in minutes (used by timer-based habits)
  timeGoal?: number;
  startDate: string;
  active: boolean;
  notificationId?: string;
  createdAt: string;
}

export interface HabitCompletion {
  id: number;
  habitId: number;
  date: string;
  completed: boolean;
}

export interface OneTimeTask {
  id: number;
  title: string;
  date: string;
  time: string;
  notificationId?: string;
  nativeAlarmId?: string;
  completed: boolean;
  createdAt: string;
}

export interface UserSettings {
  id: number;
  displayName: string;
  avatarType: 'circle' | 'square';
  defaultTimeSection: 'morning' | 'midday' | 'evening' | 'night';
  notificationsEnabled: boolean;
  themeMode: 'system' | 'light' | 'dark';
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  public getDb() { return this.db; }
  private initialized = false;
  private webFallback = false;
  private initPromise: Promise<void> | null = null; // Track initialization promise
  private operationQueue: Array<() => Promise<any>> = []; // Queue for database operations
  private isProcessingQueue = false; // Flag to track if queue is being processed
  
  // Cache for frequently accessed data
  private habitsCache: Map<string, Habit[]> = new Map();
  private completionsCache: Map<string, Map<number, boolean>> = new Map();
  private cacheTimeouts: Map<string, NodeJS.Timeout> = new Map(); // For cache expiration

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  isWebFallback(): boolean {
    return this.webFallback;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // Add method to check if we should use the database (not in web or Expo Go without SQLite support)
  canUseDatabase(): boolean {
    return !isWeb && !this.webFallback;
  }

  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._initializeInternal();
    return this.initPromise;
  }

  private async _initializeInternal(): Promise<void> {
    if (isWeb) {
      console.log("[Database] SQLite not supported on web. Using fallback mode.");
      this.webFallback = true;
      this.initialized = true;
      this.initPromise = null; // Clear the promise
      return;
    }

    try {
      // console.log("[DatabaseService] Opening database..."); // Commented out to reduce logging
      this.db = await SQLite.openDatabaseAsync("habitflow.db");
      // console.log("[DatabaseService] Database opened successfully, db:", !!this.db); // Commented out to reduce logging

      // Execute schema creation with retry logic to handle potential locking issues
      const createTable = async (sql: string, tableName: string) => {
        const maxRetries = 5; // Increased retries for better reliability
        for (let i = 0; i < maxRetries; i++) {
          try {
            await this.db!.execAsync(sql);
            console.log(`[DatabaseService] ${tableName} created successfully`);
            break; // Success, exit retry loop
          } catch (tableError: any) {
            // Check if it's a "database is locked" error
            if (tableError?.message?.includes('database is locked') || tableError?.message?.includes('SQLITE_BUSY')) {
              if (i === maxRetries - 1) {
                console.error(`[DatabaseService] Failed to create ${tableName} due to database lock after ${maxRetries} attempts`);
                throw new Error(`Database locked: Unable to create ${tableName} table`);
              }
              console.warn(`[DatabaseService] Database locked when creating ${tableName}, attempt ${i + 1}/${maxRetries}, retrying...`);
              // Exponential backoff with jitter
              const delay = Math.min(1000 * Math.pow(2, i), 5000) + Math.random() * 100;
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // For other errors, don't retry as much
              if (i === maxRetries - 1) {
                console.error(`[DatabaseService] Failed to create ${tableName} after ${maxRetries} attempts:`, tableError);
                throw tableError;
              }
              console.warn(`[DatabaseService] Attempt ${i + 1} to create ${tableName} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
            }
          }
        }
      };
      
      // Create tables one by one with retry logic
      await createTable(`
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          timeSection TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT 'activity',
          color TEXT NOT NULL DEFAULT '#4CAF50',
          reminderTime TEXT,
          time_goal INTEGER,
          startDate TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          notificationId TEXT,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, "habits");

      // Migration: add time_goal column if it doesn't exist (safe to run multiple times)
      try {
        await this.db!.execAsync(`ALTER TABLE habits ADD COLUMN time_goal INTEGER;`);
      } catch (e) {
        // Ignore - column likely already exists
      }
      
      await createTable(`
        CREATE TABLE IF NOT EXISTS habit_completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId INTEGER NOT NULL,
          date TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE,
          UNIQUE(habitId, date)
        );
      `, "habit_completions");
      
      await createTable(`
        CREATE TABLE IF NOT EXISTS one_time_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          notificationId TEXT,
          nativeAlarmId TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, "one_time_tasks");

      // Migration: add nativeAlarmId column if it doesn't exist (safe to run multiple times)
      try {
        await this.db!.execAsync(`ALTER TABLE one_time_tasks ADD COLUMN nativeAlarmId TEXT;`);
      } catch (e) {
        // Ignore - column likely already exists
      }
      
      await createTable(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          displayName TEXT NOT NULL DEFAULT 'You',
          avatarType TEXT NOT NULL DEFAULT 'circle',
          defaultTimeSection TEXT NOT NULL DEFAULT 'morning',
          notificationsEnabled INTEGER NOT NULL DEFAULT 1,
          themeMode TEXT NOT NULL DEFAULT 'system'
        );
      `, "user_settings");
      
      // Execute the user_settings insertion with retry logic to handle potential locking issues
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this.db!.execAsync(`
            INSERT OR IGNORE INTO user_settings (id) VALUES (1);
          `);
          // console.log("[DatabaseService] user_settings default row inserted successfully"); // Commented out to reduce logging
          break; // Success, exit retry loop
        } catch (insertError) {
          if (i === maxRetries - 1) {
            console.error("[DatabaseService] Failed to insert default user_settings row after " + maxRetries + " attempts:", insertError);
            // Don't throw the error, just log it, as this is not critical to app functionality
          } else {
            // console.warn(`[DatabaseService] Attempt ${i + 1} to insert user_settings failed, retrying...`); // Commented out to reduce logging
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // Exponential backoff
          }
        }
      }
      
      await createTable(`
        CREATE TABLE IF NOT EXISTS habit_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL,
          mode TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          created_date TEXT NOT NULL,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
      `, "habit_sessions");

      // console.log("[DatabaseService] All tables created successfully"); // Commented out to reduce logging

      this.initialized = true;
      // console.log("[DatabaseService] Initialization completed successfully"); // Commented out to reduce logging
    } catch (error) {
      // Reduce error logging to prevent spam
      // console.error("[DatabaseService] Database initialization error:", error);
      // Reset state on error to allow re-initialization
      this.initialized = false;
      this.db = null;
      throw error;
    } finally {
      this.initPromise = null; // Clear the promise when done
    }
  }

  private ensureInitialized(): boolean {
    if (!this.initialized) {
      // Don't log warnings for every call to reduce spam
      return false;
    }
    if (this.webFallback) {
      // console.log("[DatabaseService] Using web fallback"); // Commented out to reduce logging
      return false;
    }
    if (!this.db) {
      // Don't log warnings for every call to reduce spam
      return false;
    }
    
    // The database is initialized and the connection exists
    return true;
  }

  // Add a method to check if the database is ready with additional safety
  private isDatabaseReady(): boolean {
    return this.initialized && !this.webFallback && !!this.db;
  }

  // Cache management methods
  private setCache<T>(key: string, value: T, ttl: number = 300000): void { // 5 minutes default
    // Clear any existing timeout
    if (this.cacheTimeouts.has(key)) {
      clearTimeout(this.cacheTimeouts.get(key)!);
      this.cacheTimeouts.delete(key);
    }
    
    // Set the cache value
    if (key.startsWith('habits:')) {
      this.habitsCache.set(key, value as Habit[]);
    } else if (key.startsWith('completions:')) {
      this.completionsCache.set(key, value as Map<number, boolean>);
    }
    
    // Set timeout to clear cache
    const timeout = setTimeout(() => {
      this.clearCache(key);
    }, ttl);
    
    this.cacheTimeouts.set(key, timeout);
  }
  
  private getCache<T>(key: string): T | null {
    if (key.startsWith('habits:')) {
      return this.habitsCache.get(key) as T || null;
    } else if (key.startsWith('completions:')) {
      return this.completionsCache.get(key) as T || null;
    }
    return null;
  }
  
  private clearCache(key: string): void {
    if (key.startsWith('habits:')) {
      this.habitsCache.delete(key);
    } else if (key.startsWith('completions:')) {
      this.completionsCache.delete(key);
    }
    
    if (this.cacheTimeouts.has(key)) {
      clearTimeout(this.cacheTimeouts.get(key)!);
      this.cacheTimeouts.delete(key);
    }
  }
  
  private clearAllCaches(): void {
    this.habitsCache.clear();
    this.completionsCache.clear();
    
    // Clear all timeouts
    for (const timeout of this.cacheTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.cacheTimeouts.clear();
  }
  
  // Add a method to queue database operations to avoid locking issues
  public async executeWithQueue<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isDatabaseReady()) {
      throw new Error("Database is not ready");
    }

    return new Promise<T>((resolve, reject) => {
      // Add operation to queue
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.operationQueue.length === 0 || this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          // Reduce error logging to prevent spam
          // console.error("Error in database operation queue:", error);
          // Continue with next operation even if one fails
        }
      }
      // Reduce delay to improve performance
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessingQueue = false;
    
    // Process any new operations that were added while processing
    if (this.operationQueue.length > 0 && !this.isProcessingQueue) {
      // Use immediate instead of setTimeout for better performance
      (global.setImmediate || setImmediateFallback)(() => {
        if (this.operationQueue.length > 0 && !this.isProcessingQueue) {
          this.processQueue();
        }
      });
    }
  }

  // Add this method to allow reinitialization if needed
  async reinitialize(): Promise<void> {
    console.log("[DatabaseService] Reinitializing database...");
    this.initialized = false;
    this.db = null;
    await this.initialize();
  }

  async getAllHabits(): Promise<Habit[]> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getAllHabits called but database is not ready");
      return [];
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getAllAsync<any>("SELECT * FROM habits ORDER BY timeSection, name");
        return result.map((row) => ({
          ...row,
          active: Boolean(row.active),
        }));
      } catch (error) {
        console.error("Error getting habits:", error);
        return [];
      }
    });
  }

  async getActiveHabits(): Promise<Habit[]> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getActiveHabits called but database is not ready");
      return [];
    }
    
    // Try to get from cache first
    const cacheKey = 'habits:active';
    const cached = this.getCache<Habit[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getAllAsync<any>(
          "SELECT * FROM habits WHERE active = 1 ORDER BY timeSection, name"
        );
        const habits = result.map((row) => ({
          ...row,
          active: Boolean(row.active),
        }));
        
        // Cache the result
        this.setCache(cacheKey, habits);
        
        return habits;
      } catch (error) {
        console.error("Error getting active habits:", error);
        return [];
      }
    });
  }

  async getHabitById(id: number): Promise<Habit | null> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getHabitById called but database is not ready");
      return null;
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getFirstAsync<any>(
          "SELECT * FROM habits WHERE id = ?",
          [id]
        );
        if (!result) return null;
        // Ensure icon is not undefined, default to 'activity' if it is
        if (!result.icon) {
          result.icon = 'activity';
        }
        return { ...result, active: Boolean(result.active) };
      } catch (error) {
        console.error("Error getting habit:", error);
        return null;
      }
    });
  }

  async createHabit(habit: Omit<Habit, "id" | "createdAt">): Promise<number> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] createHabit called but database is not ready");
      return -1;
    }
    return this.executeWithQueue(async () => {
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await this.db!.runAsync(
            `INSERT INTO habits (name, timeSection, icon, color, reminderTime, time_goal, startDate, active, notificationId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              habit.name,
              habit.timeSection,
              habit.icon,
              habit.color,
              habit.reminderTime || null, // Convert undefined to null for database
              habit.timeGoal ?? null,
              habit.startDate,
              habit.active ? 1 : 0,
              habit.notificationId || null, // Convert undefined to null for database
            ]
          );
          
          // Clear habits cache to ensure new habit appears immediately
          this.clearCache('habits:active');
          
          return result.lastInsertRowId;
        } catch (error) {
          if (i === maxRetries - 1) {
            console.error("Error creating habit after " + maxRetries + " attempts:", error);
            throw error;
          } else {
            console.warn(`[DatabaseService] Attempt ${i + 1} to create habit failed, retrying...`);
            // Increase delay for more aggressive backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i))); // Exponential backoff
          }
        }
      }
      return -1; // This line should never be reached, but added for TypeScript safety
    });
  }

  async updateHabit(id: number, habit: Partial<Omit<Habit, "id" | "createdAt">>): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] updateHabit called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const fields: string[] = [];
          const values: any[] = [];

          if (habit.name !== undefined) {
            fields.push("name = ?");
            values.push(habit.name);
          }
          if (habit.timeSection !== undefined) {
            fields.push("timeSection = ?");
            values.push(habit.timeSection);
          }
          if (habit.icon !== undefined) {
            fields.push("icon = ?");
            values.push(habit.icon);
          }
          if (habit.color !== undefined) {
            fields.push("color = ?");
            values.push(habit.color);
          }
          if (habit.reminderTime !== undefined) {
            fields.push("reminderTime = ?");
            values.push(habit.reminderTime);
          }
          if (habit.startDate !== undefined) {
            fields.push("startDate = ?");
            values.push(habit.startDate);
          }
          if (habit.active !== undefined) {
            fields.push("active = ?");
            values.push(habit.active ? 1 : 0);
          }
          if (habit.notificationId !== undefined) {
            fields.push("notificationId = ?");
            values.push(habit.notificationId);
          }

          if (fields.length === 0) return;

          values.push(id);
          await this.db!.runAsync(
            `UPDATE habits SET ${fields.join(", ")} WHERE id = ?`,
            values
          );
          
          // Clear the habits cache since we've updated a habit
          this.clearCache('habits:active');
          this.clearCache(`streak:${id}`); // Clear streak cache for this habit if it was affected
          
          break; // Success, exit retry loop
        } catch (error) {
          if (i === maxRetries - 1) {
            console.error("Error updating habit after " + maxRetries + " attempts:", error);
            throw error;
          } else {
            console.warn(`[DatabaseService] Attempt ${i + 1} to update habit failed, retrying...`);
            // Increase delay for more aggressive backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i))); // Exponential backoff
          }
        }
      }
    });
  }

  async deleteHabit(id: number): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] deleteHabit called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this.db!.runAsync("DELETE FROM habits WHERE id = ?", [id]);
          await this.db!.runAsync("DELETE FROM habit_completions WHERE habitId = ?", [id]);
                  
          // Clear the habits cache since we've deleted a habit
          this.clearCache('habits:active');
          this.clearCache(`streak:${id}`); // Clear streak cache for this habit
                  
          break; // Success, exit retry loop
        } catch (error) {
          if (i === maxRetries - 1) {
            console.error("Error deleting habit after " + maxRetries + " attempts:", error);
            throw error;
          } else {
            console.warn(`[DatabaseService] Attempt ${i + 1} to delete habit failed, retrying...`);
            // Increase delay for more aggressive backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i))); // Exponential backoff
          }
        }
      }
    });
  }

  async getCompletionForDate(habitId: number, date: string): Promise<boolean> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getCompletionForDate called but database is not ready");
      return false;
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getFirstAsync<any>(
          "SELECT completed FROM habit_completions WHERE habitId = ? AND date = ?",
          [habitId, date]
        );
        return result ? Boolean(result.completed) : false;
      } catch (error) {
        console.error("Error getting completion:", error);
        return false;
      }
    });
  }

  async getCompletionsForDate(date: string): Promise<{ habitId: number; completed: boolean }[]> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getCompletionsForDate called but database is not ready");
      return [];
    }
    
    // Try to get from cache first
    const cacheKey = `completions:${date}`;
    const cached = this.getCache<{ habitId: number; completed: boolean }[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getAllAsync<any>(
          "SELECT habitId, completed FROM habit_completions WHERE date = ?",
          [date]
        );
        const completions = result.map((row) => ({
          habitId: row.habitId,
          completed: Boolean(row.completed),
        }));
        
        // Cache the result
        this.setCache(cacheKey, completions);
        
        return completions;
      } catch (error) {
        console.error("Error getting completions:", error);
        return [];
      }
    });
  }

  async setCompletion(habitId: number, date: string, completed: boolean): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] setCompletion called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this.db!.runAsync(
            `INSERT INTO habit_completions (habitId, date, completed)
             VALUES (?, ?, ?)
             ON CONFLICT(habitId, date) DO UPDATE SET completed = ?`,
            [habitId, date, completed ? 1 : 0, completed ? 1 : 0]
          );
          
          // Clear the cache for this date to force a refresh
          const cacheKey = `completions:${date}`;
          this.clearCache(cacheKey);
          
          // Also clear the habits cache since it might affect streaks
          this.clearCache('habits:active');
          
          // Clear the streak cache for this habit since completion affects it
          this.clearCache(`streak:${habitId}`);
          
          break; // Success, exit retry loop
        } catch (error) {
          if (i === maxRetries - 1) {
            console.error("Error setting completion after " + maxRetries + " attempts:", error);
            throw error;
          } else {
            console.warn(`[DatabaseService] Attempt ${i + 1} to set completion failed, retrying...`);
            // Increase delay for more aggressive backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i))); // Exponential backoff
          }
        }
      }
    });
  }

  async getCompletionsForMonth(year: number, month: number): Promise<Map<string, { total: number; completed: number }>> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getCompletionsForMonth called but database is not ready");
      return new Map();
    }
    
    // Try to get from cache first
    const cacheKey = `completions:month:${year}-${month}`;
    const cached = this.getCache<Map<string, { total: number; completed: number }>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    return this.executeWithQueue(async () => {
      try {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

        const completions = await this.db!.getAllAsync<any>(
          `SELECT date, COUNT(*) as total, SUM(completed) as completed
           FROM habit_completions
           WHERE date >= ? AND date <= ?
           GROUP BY date`,
          [startDate, endDate]
        );

        const result = new Map<string, { total: number; completed: number }>();
        for (const row of completions) {
          result.set(row.date, { total: row.total, completed: row.completed });
        }
        
        // Cache the result
        this.setCache(cacheKey, result);
        
        return result;
      } catch (error) {
        console.error("Error getting month completions:", error);
        return new Map();
      }
    });
  }

  async getCompletionsForHabitInRange(habitId: number, startDate: string, endDate: string): Promise<{ date: string; completed: boolean }[]> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getCompletionsForHabitInRange called but database is not ready");
      return [];
    }
    
    // Try to get from cache first
    const cacheKey = `completions:habit:${habitId}:${startDate}:${endDate}`;
    const cached = this.getCache<{ date: string; completed: boolean }[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    return this.executeWithQueue(async () => {
      try {
        const completions = await this.db!.getAllAsync<any>(
          `SELECT date, completed
           FROM habit_completions
           WHERE habitId = ? AND date >= ? AND date <= ?
           ORDER BY date`,
          [habitId, startDate, endDate]
        );

        const result = completions.map(row => ({
          date: row.date,
          completed: Boolean(row.completed)
        }));
        
        // Cache the result
        this.setCache(cacheKey, result);
        
        return result;
      } catch (error) {
        console.error("Error getting habit completions in range:", error);
        return [];
      }
    });
  }

  async getHabitStreak(habitId: number): Promise<number> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getHabitStreak called but database is not ready");
      return 0;
    }
    
    // Try to get from cache first
    const cacheKey = `streak:${habitId}`;
    const cached = this.getCache<number>(cacheKey);
    if (cached) {
      return cached;
    }
    
    return this.executeWithQueue(async () => {
      try {
        const completions = await this.db!.getAllAsync<any>(
          `SELECT date FROM habit_completions
           WHERE habitId = ? AND completed = 1
           ORDER BY date DESC`,
          [habitId]
        );

        if (completions.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        let checkDate = new Date(today);

        for (const { date } of completions) {
          const completionDate = new Date(date);
          const daysDiff = Math.floor(
            (checkDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 1) {
            streak++;
            checkDate = completionDate;
          } else {
            break;
          }
        }
        
        // Cache the result
        this.setCache(cacheKey, streak);
        
        return streak;
      } catch (error) {
        console.error("Error getting streak:", error);
        return 0;
      }
    });
  }

  async getOneTimeTask(): Promise<OneTimeTask | null> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getOneTimeTask called but database is not ready");
      return null;
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getFirstAsync<any>(
          "SELECT * FROM one_time_tasks WHERE completed = 0 ORDER BY date, time LIMIT 1"
        );
        if (!result) return null;
        return { ...result, completed: Boolean(result.completed) };
      } catch (error) {
        console.error("Error getting task:", error);
        return null;
      }
    });
  }

  async getAllOneTimeTasks(): Promise<OneTimeTask[]> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getAllOneTimeTasks called but database is not ready");
      return [];
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getAllAsync<any>(
          "SELECT * FROM one_time_tasks WHERE completed = 0 ORDER BY date, time"
        );
        return result.map((row) => ({
          ...row,
          completed: Boolean(row.completed),
        }));
      } catch (error) {
        console.error("Error getting all tasks:", error);
        return [];
      }
    });
  }

  async createOneTimeTask(task: Omit<OneTimeTask, "id" | "completed" | "createdAt">): Promise<number> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] createOneTimeTask called but database is not ready");
      return -1;
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.runAsync(
          `INSERT INTO one_time_tasks (title, date, time, notificationId, nativeAlarmId)
           VALUES (?, ?, ?, ?, ?)`,
          [task.title, task.date, task.time, task.notificationId || null, (task as any).nativeAlarmId || null]
        );
        return result.lastInsertRowId;
      } catch (error) {
        console.error("Error creating task:", error);
        throw error;
      }
    });
  }

  async deleteOneTimeTask(id: number): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] deleteOneTimeTask called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      try {
        await this.db!.runAsync("DELETE FROM one_time_tasks WHERE id = ?", [id]);
      } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
      }
    });
  }

  async completeOneTimeTask(id: number): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] completeOneTimeTask called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      try {
        await this.db!.runAsync("UPDATE one_time_tasks SET completed = 1 WHERE id = ?", [id]);
      } catch (error) {
        console.error("Error completing task:", error);
        throw error;
      }
    });
  }

  async updateOneTimeTask(id: number, task: Partial<Omit<OneTimeTask, "id" | "createdAt">>): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] updateOneTimeTask called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      try {
        const fields: string[] = [];
        const values: any[] = [];

        if (task.title !== undefined) {
          fields.push("title = ?");
          values.push(task.title);
        }
        if (task.date !== undefined) {
          fields.push("date = ?");
          values.push(task.date);
        }
        if (task.time !== undefined) {
          fields.push("time = ?");
          values.push(task.time);
        }
        if (task.notificationId !== undefined) {
          fields.push("notificationId = ?");
          values.push(task.notificationId);
        }
        if (task.completed !== undefined) {
          fields.push("completed = ?");
          values.push(task.completed ? 1 : 0);
        }

        if (fields.length === 0) return;

        values.push(id);
        await this.db!.runAsync(
          `UPDATE one_time_tasks SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
      } catch (error) {
        console.error("Error updating task:", error);
        throw error;
      }
    });
  }

  async getUserSettings(): Promise<UserSettings> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] getUserSettings called but database is not ready");
      return {
        id: 1,
        displayName: "You",
        avatarType: "circle",
        defaultTimeSection: "morning",
        notificationsEnabled: true,
        themeMode: "system",
      };
    }
    return this.executeWithQueue(async () => {
      try {
        const result = await this.db!.getFirstAsync<any>("SELECT * FROM user_settings WHERE id = 1");
        return {
          ...result,
          notificationsEnabled: Boolean(result.notificationsEnabled),
        };
      } catch (error) {
        console.error("Error getting settings:", error);
        return {
          id: 1,
          displayName: "You",
          avatarType: "circle",
          defaultTimeSection: "morning",
          notificationsEnabled: true,
          themeMode: "system",
        };
      }
    });
  }

  async updateUserSettings(settings: Partial<Omit<UserSettings, "id">>): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] updateUserSettings called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const fields: string[] = [];
          const values: any[] = [];

          if (settings.displayName !== undefined) {
            fields.push("displayName = ?");
            values.push(settings.displayName);
          }
          if (settings.avatarType !== undefined) {
            fields.push("avatarType = ?");
            values.push(settings.avatarType);
          }
          if (settings.defaultTimeSection !== undefined) {
            fields.push("defaultTimeSection = ?");
            values.push(settings.defaultTimeSection);
          }
          if (settings.notificationsEnabled !== undefined) {
            fields.push("notificationsEnabled = ?");
            values.push(settings.notificationsEnabled ? 1 : 0);
          }
          if (settings.themeMode !== undefined) {
            fields.push("themeMode = ?");
            values.push(settings.themeMode);
          }

          if (fields.length === 0) return;

          values.push(1); // id is always 1 for user_settings
          await this.db!.runAsync(
            `UPDATE user_settings SET ${fields.join(", ")} WHERE id = ?`,
            values
          );
          
          // For future extensibility - clear any settings-related cache if added
          
          break; // Success, exit retry loop
        } catch (error) {
          if (i === maxRetries - 1) {
            console.error("Error updating settings after " + maxRetries + " attempts:", error);
            throw error;
          } else {
            console.warn(`[DatabaseService] Attempt ${i + 1} to update settings failed, retrying...`);
            // Increase delay for more aggressive backoff
            await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i))); // Exponential backoff
          }
        }
      }
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.isDatabaseReady()) {
      console.warn("[DatabaseService] clearAllData called but database is not ready");
      return;
    }
    return this.executeWithQueue(async () => {
      try {
        // Clear all habit-related data
        await this.db!.execAsync("DELETE FROM habit_completions; DELETE FROM habits;");
        // Clear all task-related data
        await this.db!.execAsync("DELETE FROM one_time_tasks;");
        // Reset user settings to defaults but keep the record
        await this.db!.execAsync("UPDATE user_settings SET displayName='You', avatarType='circle', defaultTimeSection='morning', notificationsEnabled=1, themeMode='system' WHERE id=1;");
        // Clear all caches
        this.clearAllCaches();
      } catch (error) {
        console.error("Error clearing all data:", error);
        throw error;
      }
    });
  }
}

// Export the singleton instance
export const db = DatabaseService.getInstance();
