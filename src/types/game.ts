export type GameState = 
  | 'menu' 
  | 'garage' 
  | 'levels' 
  | 'playing' 
  | 'paused' 
  | 'success' 
  | 'failed' 
  | 'settings';

export type ControlType = 'wheel' | 'buttons' | 'gyro';
export type TransmissionType = 'automatic' | 'manual';
export type CameraMode = 'chase' | 'cockpit' | 'topdown' | 'orbit';

export type AutoGear = 'P' | 'R' | 'N' | 'D';

export interface KeyBindings {
  forward: string;
  backward: string;
  steerLeft: string;
  steerRight: string;
  handbrake: string;
  reset: string;
  pause: string;
  camera: string;
  minimap: string;
  gearUp: string;
  gearDown: string;
  gearReverse: string;
  gearNeutral: string;
  gear1: string;
  gear2: string;
  gear3: string;
  gear4: string;
  gear5: string;
  gear6: string;
}

export interface GameSettings {
  controlType: ControlType;
  transmission: TransmissionType;
  wheelSensitivity: number; // 0.5 to 2.0
  gyroSensitivity: number;  // 0.5 to 2.0
  masterVolume: number;     // 0 to 1
  sfxVolume: number;        // 0 to 1
  engineVolume: number;     // 0 to 1
  showMinimap: boolean;
  shadows: boolean;
  keybindings: KeyBindings;
}

export interface VehicleConfig {
  id: string;
  name: string;
  brand: string;
  category: 'Compact' | 'Coupe' | 'SUV' | 'Supercar';
  description: string;
  color: string;
  accentColor: string;
  price: number;
  unlocked: boolean;
  specs: {
    topSpeedKmh: number;
    acceleration: number; // 0-10 scale
    braking: number;      // 0-10 scale
    steeringLockDeg: number; // e.g. 36 deg
    wheelbase: number;
    width: number;
    length: number;
    height: number;
    weightKg: number;
  };
}

export interface ObstacleData {
  id: string;
  type: 'cone' | 'barrier' | 'pillar' | 'parked_car';
  x: number;
  z: number;
  rotation?: number;
  width?: number;
  length?: number;
  height?: number;
  color?: string;
}

export interface ParkingTarget {
  x: number;
  z: number;
  width: number;
  length: number;
  rotation: number; // in radians
  reverseParkingPreferred?: boolean;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  parTimeSeconds: number;
  environment: 'day' | 'sunset' | 'night' | 'underground';
  playerStart: {
    x: number;
    z: number;
    rotation: number; // radians
  };
  parkingTarget: ParkingTarget;
  obstacles: ObstacleData[];
  boundary: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gearDisplay: string;
  currentGear: number; // -1: R, 0: N, 1..6: Forward gears
  autoGear: AutoGear;
  fuelPercent: number;
  damagePercent: number;
  steeringAngleNorm: number; // -1.0 (full left) to 1.0 (full right)
  handbrake: boolean;
  isBraking: boolean;
  isReversing: boolean;
  inParkingZone: boolean;
  alignmentScorePercent: number;
  parkingTimeProgress: number; // 0 to 1 (needs 1.5s hold)
  proximityDistance: number; // distance to nearest obstacle
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  stars: number;
  bestTime: number;
  bestAccuracy: number;
}
