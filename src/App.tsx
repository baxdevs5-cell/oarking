import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  GameSettings,
  VehicleConfig,
  LevelConfig,
  VehicleTelemetry,
  CameraMode,
  AutoGear,
} from './types/game';
import { VEHICLES, LEVELS, DEFAULT_SETTINGS } from './game/constants';
import {
  loadSettings,
  saveSettings,
  loadProgress,
  saveLevelResult,
  loadCoins,
  addCoins,
  loadUnlockedCars,
  unlockCar,
  loadSelectedCar,
  saveSelectedCar,
} from './services/storage';
import { sound } from './services/sound';
import { CarPhysics, RawInput } from './game/physics';
import { ThreeRenderer } from './game/threeRenderer';

import { MainMenu } from './components/MainMenu';
import { GarageMenu } from './components/GarageMenu';
import { LevelSelect } from './components/LevelSelect';
import { DashboardHUD } from './components/DashboardHUD';
import { MobileControls } from './components/MobileControls';
import { SettingsModal } from './components/SettingsModal';
import { GameSuccessModal } from './components/GameSuccessModal';
import { GameFailedModal } from './components/GameFailedModal';
import { PauseModal } from './components/PauseModal';

export default function App() {
  // Persistent States
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [progress, setProgress] = useState(() => loadProgress());
  const [coins, setCoins] = useState(() => loadCoins());
  const [unlockedCarIds, setUnlockedCarIds] = useState<string[]>(() => loadUnlockedCars());
  const [selectedCarId, setSelectedCarId] = useState<string>(() => loadSelectedCar());
  const [vehicles, setVehicles] = useState<VehicleConfig[]>(VEHICLES);

  // Active Flow State
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [showMinimap, setShowMinimap] = useState<boolean>(settings.showMinimap);
  const [previousStateBeforeSettings, setPreviousStateBeforeSettings] = useState<GameState>('menu');

  // Mission Results
  const [missionTime, setMissionTime] = useState(0);
  const [missionResult, setMissionResult] = useState<{
    stars: number;
    timeTaken: number;
    accuracy: number;
    damage: number;
    coinsEarned: number;
  } | null>(null);

  // Active Selected Vehicle & Level Config
  const selectedCar = vehicles.find((v) => v.id === selectedCarId) || vehicles[0];
  const currentLevel = LEVELS.find((lvl) => lvl.id === currentLevelId) || LEVELS[0];

  // Canvas Viewport Ref
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeRendererRef = useRef<ThreeRenderer | null>(null);
  const physicsRef = useRef<CarPhysics | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const levelStartTimeRef = useRef<number>(performance.now());

  // Input States
  const activeKeys = useRef<Set<string>>(new Set());
  const touchThrottle = useRef<number>(0);
  const touchBrake = useRef<number>(0);
  const touchSteer = useRef<number>(0);
  const touchHandbrake = useRef<boolean>(false);

  // Live Telemetry for HUD
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    rpm: 900,
    gearDisplay: 'D',
    currentGear: 1,
    autoGear: 'D',
    fuelPercent: 98,
    damagePercent: 0,
    steeringAngleNorm: 0,
    handbrake: false,
    isBraking: false,
    isReversing: false,
    inParkingZone: false,
    alignmentScorePercent: 0,
    parkingTimeProgress: 0,
    proximityDistance: 99,
  });

  const [minimapCarPos, setMinimapCarPos] = useState({ x: 0, z: 0, rot: 0 });

  // Compute total stars earned across all missions
  const totalStars = Object.values(progress).reduce((acc, p) => acc + (p.stars || 0), 0);

  // 1. Initialize or Recreate 3D Simulation for Level
  const initSimulation = useCallback(() => {
    if (!canvasContainerRef.current) return;

    // Dispose prior renderer
    if (threeRendererRef.current) {
      threeRendererRef.current.dispose();
      threeRendererRef.current = null;
    }

    // Create Physics instance
    const physics = new CarPhysics(selectedCar, currentLevel, settings.transmission);
    physicsRef.current = physics;

    // Create Three.js Renderer
    const renderer = new ThreeRenderer(
      canvasContainerRef.current,
      physics,
      selectedCar,
      currentLevel
    );
    renderer.cameraMode = cameraMode;
    threeRendererRef.current = renderer;

    levelStartTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    setMissionTime(0);
    setMissionResult(null);

    // Audio resume
    sound.resume();
  }, [selectedCar, currentLevel, settings.transmission, cameraMode]);

  // 2. Start / Restart Playing Game
  const handleStartPlaying = (levelId?: number) => {
    if (levelId !== undefined) {
      setCurrentLevelId(levelId);
    }
    setGameState('playing');
    sound.resume();
  };

  const handleResetCar = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.resetToStart();
      levelStartTimeRef.current = performance.now();
      sound.playClick();
    }
  }, []);

  // 3. Setup Simulation Lifecycle when entering 'playing'
  useEffect(() => {
    if (gameState === 'playing') {
      initSimulation();
    }

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [gameState, currentLevelId, selectedCarId, initSimulation]);

  // 4. Main Simulation Loop (Physics + 3D Render + Telemetry)
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'paused') {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let isRunning = true;

    const gameLoop = (currentTime: number) => {
      if (!isRunning) return;

      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const physics = physicsRef.current;
      const renderer = threeRendererRef.current;

      if (physics && renderer && gameState === 'playing') {
        // Collect Keyboard Inputs using configured keybindings
        const bindings = settings.keybindings;
        let kbThrottle = 0;
        let kbBrake = 0;
        let kbSteer = 0;
        let kbHandbrake = false;

        if (activeKeys.current.has(bindings.forward)) kbThrottle += 1.0;
        if (activeKeys.current.has(bindings.backward)) kbBrake += 1.0;
        if (activeKeys.current.has(bindings.steerLeft)) kbSteer -= 1.0;
        if (activeKeys.current.has(bindings.steerRight)) kbSteer += 1.0;
        if (activeKeys.current.has(bindings.handbrake)) kbHandbrake = true;

        // Merge Keyboard with Touch/Mobile Controls seamlessly
        const mergedThrottle = Math.max(kbThrottle, touchThrottle.current);
        const mergedBrake = Math.max(kbBrake, touchBrake.current);
        const mergedSteer = Math.abs(touchSteer.current) > 0.02 ? touchSteer.current : kbSteer;
        const mergedHandbrake = kbHandbrake || touchHandbrake.current;

        const rawInput: RawInput = {
          throttle: mergedThrottle,
          brake: mergedBrake,
          steer: mergedSteer,
          handbrake: mergedHandbrake,
        };

        // Update Physics
        physics.update(dt, rawInput);

        // Render 3D Scene
        renderer.render();

        // Update Live Telemetry
        const telem = physics.getTelemetry();
        setTelemetry(telem);
        setMinimapCarPos({ x: physics.x, z: physics.z, rot: physics.rotation });

        // Update Mission Clock
        const elapsed = (performance.now() - levelStartTimeRef.current) / 1000;
        setMissionTime(elapsed);

        // Check Victory Condition
        if (physics.isCompleted) {
          const par = currentLevel.parTimeSeconds;
          let calculatedStars = 1;
          if (elapsed <= par * 1.3 && physics.damage < 40) calculatedStars = 2;
          if (elapsed <= par && physics.damage < 15) calculatedStars = 3;

          const coinsAwarded = 250 + calculatedStars * 100;
          const newCoinTotal = addCoins(coinsAwarded);
          setCoins(newCoinTotal);

          saveLevelResult(currentLevel.id, calculatedStars, elapsed, telem.alignmentScorePercent);
          setProgress(loadProgress());

          setMissionResult({
            stars: calculatedStars,
            timeTaken: elapsed,
            accuracy: telem.alignmentScorePercent,
            damage: telem.damagePercent,
            coinsEarned: coinsAwarded,
          });

          setGameState('success');
        }

        // Check Vehicle Crash Condition
        if (physics.isFailed) {
          setGameState('failed');
        }
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [gameState, settings, currentLevel]);

  // 5. Global Keyboard Listener (with keydown/keyup events and remapping)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Audio resume on first key
      sound.resume();

      if (gameState === 'playing') {
        const b = settings.keybindings;

        // Pause
        if (e.code === b.pause || e.code === 'Escape') {
          e.preventDefault();
          setGameState('paused');
          sound.playClick();
          return;
        }

        // Reset car
        if (e.code === b.reset) {
          e.preventDefault();
          handleResetCar();
          return;
        }

        // Camera switch
        if (e.code === b.camera) {
          e.preventDefault();
          if (threeRendererRef.current) {
            threeRendererRef.current.switchCamera();
            setCameraMode(threeRendererRef.current.cameraMode);
          }
          return;
        }

        // Minimap toggle
        if (e.code === b.minimap) {
          e.preventDefault();
          setShowMinimap((prev) => !prev);
          return;
        }

        // Manual Transmission Gear Controls
        if (settings.transmission === 'manual' && physicsRef.current) {
          if (e.code === b.gear1) physicsRef.current.setManualGear(1);
          else if (e.code === b.gear2) physicsRef.current.setManualGear(2);
          else if (e.code === b.gear3) physicsRef.current.setManualGear(3);
          else if (e.code === b.gear4) physicsRef.current.setManualGear(4);
          else if (e.code === b.gear5) physicsRef.current.setManualGear(5);
          else if (e.code === b.gear6) physicsRef.current.setManualGear(6);
          else if (e.code === b.gearNeutral) physicsRef.current.setManualGear(0);
          else if (e.code === b.gearReverse) physicsRef.current.setManualGear(-1);
          else if (e.code === b.gearUp) physicsRef.current.shiftManualUp();
          else if (e.code === b.gearDown) physicsRef.current.shiftManualDown();
        } else if (settings.transmission === 'automatic' && physicsRef.current) {
          // G toggles or cycles gear
          if (e.code === b.gearReverse) {
            physicsRef.current.cycleAutoGear();
          } else if (e.code === b.gearNeutral) {
            physicsRef.current.setAutoGear('N');
          }
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setGameState('playing');
          return;
        }
      }

      // Add to active keys
      activeKeys.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, settings, handleResetCar]);

  // 6. Garage Actions
  const handleSelectCar = (carId: string) => {
    setSelectedCarId(carId);
    saveSelectedCar(carId);
    sound.playClick();
  };

  const handleUnlockCar = (carId: string, price: number) => {
    if (coins >= price) {
      const nextCoins = coins - price;
      setCoins(nextCoins);
      addCoins(-price);
      const unlocked = unlockCar(carId);
      setUnlockedCarIds(unlocked);
      setSelectedCarId(carId);
      saveSelectedCar(carId);
      sound.playSuccessChime();
    }
  };

  const handleUpdateCarColor = (carId: string, colorHex: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === carId ? { ...v, color: colorHex } : v))
    );
    sound.playClick();
  };

  // 7. Save Settings Callback
  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    setShowMinimap(newSettings.showMinimap);
    saveSettings(newSettings);
    if (physicsRef.current) {
      physicsRef.current.setTransmission(newSettings.transmission);
    }
  };

  // 8. Next Level Navigation
  const handleNextLevel = () => {
    const nextId = currentLevelId + 1;
    const exists = LEVELS.some((lvl) => lvl.id === nextId);
    if (exists) {
      setCurrentLevelId(nextId);
      handleStartPlaying(nextId);
    } else {
      setGameState('levels');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Layer (Mounted continuously during active game sessions) */}
      <div
        ref={canvasContainerRef}
        className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-300 ${
          gameState === 'playing' || gameState === 'paused' || gameState === 'success' || gameState === 'failed'
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* IN-GAME HUD & OVERLAYS */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <>
          {/* Dashboard Instrument Cluster HUD */}
          <DashboardHUD
            telemetry={telemetry}
            cameraMode={cameraMode}
            transmission={settings.transmission}
            levelTitle={currentLevel.title}
            showMinimap={showMinimap}
            minimapCarPos={minimapCarPos}
            parkingTarget={currentLevel.parkingTarget}
            boundary={currentLevel.boundary}
            onSwitchCamera={() => {
              if (threeRendererRef.current) {
                threeRendererRef.current.switchCamera();
                setCameraMode(threeRendererRef.current.cameraMode);
              }
            }}
            onToggleMinimap={() => setShowMinimap((prev) => !prev)}
            onResetCar={handleResetCar}
            onPause={() => setGameState('paused')}
          />

          {/* Touch / Mobile Controls Overlay (Steering Wheel / Buttons / Gyro + Pedals) */}
          <MobileControls
            controlType={settings.controlType}
            transmission={settings.transmission}
            autoGear={telemetry.autoGear}
            currentManualGear={telemetry.currentGear}
            sensitivity={settings.wheelSensitivity}
            onSteerChange={(val) => {
              touchSteer.current = val;
            }}
            onThrottleChange={(val) => {
              touchThrottle.current = val;
            }}
            onBrakeChange={(val) => {
              touchBrake.current = val;
            }}
            onHandbrakeToggle={(active) => {
              touchHandbrake.current = active;
            }}
            onSetAutoGear={(gear: AutoGear) => {
              if (physicsRef.current) physicsRef.current.setAutoGear(gear);
            }}
            onShiftManualUp={() => {
              if (physicsRef.current) physicsRef.current.shiftManualUp();
            }}
            onShiftManualDown={() => {
              if (physicsRef.current) physicsRef.current.shiftManualDown();
            }}
            onSetManualGear={(gear) => {
              if (physicsRef.current) physicsRef.current.setManualGear(gear);
            }}
            onFallbackToWheel={() => {
              setSettings((prev) => ({ ...prev, controlType: 'wheel' }));
            }}
          />
        </>
      )}

      {/* MAIN MENU */}
      {gameState === 'menu' && (
        <MainMenu
          selectedCar={selectedCar}
          coins={coins}
          totalStars={totalStars}
          onStartGame={() => handleStartPlaying(currentLevelId)}
          onOpenGarage={() => setGameState('garage')}
          onOpenLevels={() => setGameState('levels')}
          onOpenSettings={() => {
            setPreviousStateBeforeSettings('menu');
            setGameState('settings');
          }}
        />
      )}

      {/* GARAGE SCREEN */}
      {gameState === 'garage' && (
        <GarageMenu
          vehicles={vehicles}
          unlockedCarIds={unlockedCarIds}
          selectedCarId={selectedCarId}
          coins={coins}
          onSelectCar={handleSelectCar}
          onUnlockCar={handleUnlockCar}
          onUpdateCarColor={handleUpdateCarColor}
          onBack={() => setGameState('menu')}
        />
      )}

      {/* LEVEL SELECT SCREEN */}
      {gameState === 'levels' && (
        <LevelSelect
          levels={LEVELS}
          progress={progress}
          currentLevelId={currentLevelId}
          onSelectLevel={(lvlId) => {
            setCurrentLevelId(lvlId);
            handleStartPlaying(lvlId);
          }}
          onBack={() => setGameState('menu')}
        />
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={() => {
            handleResetCar();
            setGameState('playing');
          }}
          onOpenSettings={() => {
            setPreviousStateBeforeSettings('paused');
            setGameState('settings');
          }}
          onHome={() => {
            if (threeRendererRef.current) {
              threeRendererRef.current.dispose();
              threeRendererRef.current = null;
            }
            setGameState('menu');
          }}
        />
      )}

      {/* SUCCESS MODAL */}
      {gameState === 'success' && missionResult && (
        <GameSuccessModal
          levelTitle={currentLevel.title}
          timeTaken={missionResult.timeTaken}
          parTime={currentLevel.parTimeSeconds}
          damagePercent={missionResult.damage}
          accuracyPercent={missionResult.accuracy}
          coinsEarned={missionResult.coinsEarned}
          stars={missionResult.stars}
          hasNextLevel={currentLevelId < LEVELS.length}
          onNextLevel={handleNextLevel}
          onReplay={() => {
            handleResetCar();
            setGameState('playing');
          }}
          onHome={() => {
            if (threeRendererRef.current) {
              threeRendererRef.current.dispose();
              threeRendererRef.current = null;
            }
            setGameState('menu');
          }}
        />
      )}

      {/* FAILED / CRASH MODAL */}
      {gameState === 'failed' && (
        <GameFailedModal
          levelTitle={currentLevel.title}
          onRestart={() => {
            handleResetCar();
            setGameState('playing');
          }}
          onHome={() => {
            if (threeRendererRef.current) {
              threeRendererRef.current.dispose();
              threeRendererRef.current = null;
            }
            setGameState('menu');
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {gameState === 'settings' && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setGameState(previousStateBeforeSettings)}
        />
      )}
    </div>
  );
}
