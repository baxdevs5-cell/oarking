import { GameSettings, LevelProgress } from '../types/game';
import { DEFAULT_SETTINGS, VEHICLES } from '../game/constants';

const SETTINGS_KEY = 'parcking_settings_v1';
const PROGRESS_KEY = 'parcking_progress_v1';
const UNLOCKED_CARS_KEY = 'parcking_unlocked_cars_v1';
const COINS_KEY = 'parcking_coins_v1';
const SELECTED_CAR_KEY = 'parcking_selected_car_v1';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keybindings: {
        ...DEFAULT_SETTINGS.keybindings,
        ...(parsed.keybindings || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return {
        1: { levelId: 1, completed: false, stars: 0, bestTime: 0, bestAccuracy: 0 },
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      1: { levelId: 1, completed: false, stars: 0, bestTime: 0, bestAccuracy: 0 },
    };
  }
}

export function saveLevelResult(levelId: number, stars: number, timeTaken: number, accuracy: number): void {
  try {
    const all = loadProgress();
    const existing = all[levelId] || { levelId, completed: false, stars: 0, bestTime: 9999, bestAccuracy: 0 };

    all[levelId] = {
      levelId,
      completed: true,
      stars: Math.max(existing.stars, stars),
      bestTime: existing.bestTime > 0 ? Math.min(existing.bestTime, timeTaken) : timeTaken,
      bestAccuracy: Math.max(existing.bestAccuracy, accuracy),
    };

    // Unlock next level
    if (!all[levelId + 1]) {
      all[levelId + 1] = { levelId: levelId + 1, completed: false, stars: 0, bestTime: 0, bestAccuracy: 0 };
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function loadCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_KEY);
    return raw ? parseInt(raw, 10) : 500;
  } catch {
    return 500;
  }
}

export function addCoins(amount: number): number {
  const current = loadCoins();
  const next = current + amount;
  try {
    localStorage.setItem(COINS_KEY, next.toString());
  } catch {
    // ignore
  }
  return next;
}

export function loadUnlockedCars(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_CARS_KEY);
    if (!raw) return VEHICLES.filter(v => v.unlocked).map(v => v.id);
    return JSON.parse(raw);
  } catch {
    return VEHICLES.filter(v => v.unlocked).map(v => v.id);
  }
}

export function unlockCar(carId: string): string[] {
  const current = loadUnlockedCars();
  if (!current.includes(carId)) {
    current.push(carId);
    try {
      localStorage.setItem(UNLOCKED_CARS_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }
  return current;
}

export function loadSelectedCar(): string {
  try {
    return localStorage.getItem(SELECTED_CAR_KEY) || 'compact-cruiser';
  } catch {
    return 'compact-cruiser';
  }
}

export function saveSelectedCar(id: string): void {
  try {
    localStorage.setItem(SELECTED_CAR_KEY, id);
  } catch {
    // ignore
  }
}
