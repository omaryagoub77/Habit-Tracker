import { useState, useEffect, useCallback, useRef } from "react";
import { Habit, HabitCompletion, OneTimeTask, UserSettings } from "@/database/DatabaseService";
import { db } from "@/database/DatabaseService";

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isWebFallback, setIsWebFallback] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        console.log("[Database] Initializing...");
        await db.initialize();
        console.log("[Database] Ready");
        setIsInitialized(true);
        setIsWebFallback(db.isWebFallback());
      } catch (err) {
        console.error("[Database] Initialization failed:", err);
        setError(err instanceof Error ? err : new Error("Failed to initialize database"));
      } finally {
        setIsLoading(false);
      }
    };

    initDb();
    
    // Cleanup function
    return () => {};
  }, []);

  return { isInitialized, isLoading, error, isWebFallback };
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isInitialized } = useDatabase(); // Get initialization status

  const loadHabits = useCallback(async () => {
    // Only load habits if database is initialized
    if (!isInitialized) {
      console.log("[useHabits] Skipping load - database not initialized");
      return;
    }
    
    try {
      const result = await db.getActiveHabits();
      // console.log("[useHabits] Habits loaded, count:", result.length); // Commented out to reduce logging
      setHabits(result);
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Only run effect when database is initialized
    if (isInitialized) {
      // console.log("[useHabits] Effect triggered"); // Commented out to reduce logging
      loadHabits();
    }
  }, [isInitialized, loadHabits]);

  const deleteHabit = useCallback(async (id: number) => {
    if (!isInitialized) {
      console.log("[useHabits] Skipping delete - database not initialized");
      return;
    }
    
    try {
      await db.deleteHabit(id);
      // Refresh habits after deletion
      await loadHabits();
    } catch (error) {
      console.error("Error deleting habit:", error);
      throw error;
    }
  }, [isInitialized, loadHabits]);

  return { habits, isLoading, refresh: loadHabits, deleteHabit };
}

export function useHabitCompletions(date: string) {
  const [completions, setCompletions] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { isInitialized } = useDatabase(); // Get initialization status

  const loadCompletions = useCallback(async () => {
    // Only load completions if database is initialized
    if (!isInitialized) {
      console.log("[useHabitCompletions] Skipping load - database not initialized");
      return;
    }
    
    try {
      const result = await db.getCompletionsForDate(date);
      const map = new Map<number, boolean>();
      result.forEach(({ habitId, completed }: { habitId: number; completed: boolean }) => {
        map.set(habitId, completed);
      });
      setCompletions(map);
    } catch (error) {
      console.error("Error loading completions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [date, isInitialized]);

  useEffect(() => {
    // Only run effect when database is initialized
    if (isInitialized) {
      // console.log("[useHabitCompletions] Effect triggered, date:", date); // Commented out to reduce logging
      loadCompletions();
    }
  }, [isInitialized, loadCompletions]);

  const toggleCompletion = useCallback(
    async (habitId: number) => {
      // Only allow toggle if database is initialized
      if (!isInitialized) {
        console.log("[useHabitCompletions] Skipping toggle - database not initialized");
        return;
      }
      
      const currentValue = completions.get(habitId) || false;
      const newValue = !currentValue;
      
      // Optimized state update - avoid unnecessary Map creation if value hasn't changed
      setCompletions((prev) => {
        if (prev.get(habitId) === newValue) return prev; // No change needed
        const newMap = new Map(prev);
        newMap.set(habitId, newValue);
        return newMap;
      });

      try {
        await db.setCompletion(habitId, date, newValue);
      } catch (error) {
        // Optimized error handling - only revert if needed
        setCompletions((prev) => {
          if (prev.get(habitId) === currentValue) return prev; // Already reverted
          const newMap = new Map(prev);
          newMap.set(habitId, currentValue);
          return newMap;
        });
        console.error("Error toggling completion:", error);
      }
    },
    [completions, date, isInitialized]
  );

  return { completions, isLoading, toggleCompletion, refresh: loadCompletions };
}

export function useOneTimeTasks() {
  const [tasks, setTasks] = useState<OneTimeTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isInitialized } = useDatabase(); // Get initialization status

  const loadTasks = useCallback(async () => {
    // Only load tasks if database is initialized
    if (!isInitialized) {
      console.log("[useOneTimeTasks] Skipping load - database not initialized");
      return;
    }
    
    try {
      const result = await db.getAllOneTimeTasks();
      setTasks(result);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Only run effect when database is initialized
    if (isInitialized) {
      // console.log("[useOneTimeTasks] Effect triggered"); // Commented out to reduce logging
      loadTasks();
    }
  }, [isInitialized, loadTasks]);

  return { tasks, isLoading, refresh: loadTasks };
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isInitialized } = useDatabase(); // Get initialization status

  const loadSettings = useCallback(async () => {
    // Only load settings if database is initialized
    if (!isInitialized) {
      console.log("[useUserSettings] Skipping load - database not initialized");
      return;
    }
    
    try {
      const result = await db.getUserSettings();
      setSettings(result);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Only run effect when database is initialized
    if (isInitialized) {
      // console.log("[useUserSettings] Effect triggered"); // Commented out to reduce logging
      loadSettings();
    }
  }, [isInitialized, loadSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<UserSettings, "id">>) => {
      // Only allow update if database is initialized and settings exist
      if (!isInitialized || !settings) return;
      
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      
      try {
        await db.updateUserSettings(updates);
      } catch (error) {
        setSettings(settings);
        console.error("Error updating settings:", error);
      }
    },
    [settings, isInitialized]
  );

  return { settings, isLoading, updateSettings, refresh: loadSettings };
}

