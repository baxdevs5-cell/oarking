import React from 'react';
import { VehicleTelemetry, CameraMode, TransmissionType, ParkingTarget } from '../types/game';
import { Camera, MapPin, Gauge, AlertTriangle, Fuel, Shield, Compass, RotateCcw } from 'lucide-react';

interface DashboardHUDProps {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  transmission: TransmissionType;
  levelTitle: string;
  onSwitchCamera: () => void;
  onToggleMinimap: () => void;
  onResetCar: () => void;
  onPause: () => void;
  showMinimap: boolean;
  minimapCarPos: { x: number; z: number; rot: number };
  parkingTarget: ParkingTarget;
  boundary: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export const DashboardHUD: React.FC<DashboardHUDProps> = ({
  telemetry,
  cameraMode,
  transmission,
  levelTitle,
  onSwitchCamera,
  onToggleMinimap,
  onResetCar,
  onPause,
  showMinimap,
  minimapCarPos,
  parkingTarget,
  boundary,
}) => {
  const {
    speedKmh,
    rpm,
    gearDisplay,
    fuelPercent,
    damagePercent,
    steeringAngleNorm,
    handbrake,
    isBraking,
    isReversing,
    inParkingZone,
    alignmentScorePercent,
    parkingTimeProgress,
    proximityDistance,
  } = telemetry;

  // Tachometer angle (-120deg to +120deg across 0 to 7000 RPM)
  const rpmRatio = Math.min(1, Math.max(0, (rpm - 800) / 6000));
  const tachAngle = -110 + rpmRatio * 220;

  // Speedometer angle (-110deg to +110deg across 0 to 180 km/h)
  const speedRatio = Math.min(1, speedKmh / 180);
  const speedAngle = -110 + speedRatio * 220;

  // Sonar radar danger color
  let radarColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  let radarLabel = 'SAFE';
  if (proximityDistance < 1.0) {
    radarColor = 'text-rose-500 bg-rose-500/20 border-rose-500/40 animate-pulse';
    radarLabel = 'DANGER';
  } else if (proximityDistance < 2.2) {
    radarColor = 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    radarLabel = 'CAUTION';
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-6 overflow-hidden select-none">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between gap-3 w-full">
        {/* Mission Level Banner */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs shadow-lg">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-200 tracking-wide">{levelTitle}</span>
            <span className="text-[10px] text-slate-400 font-mono-nums">
              Mode: {transmission.toUpperCase()} · Trans: {gearDisplay}
            </span>
          </div>
        </div>

        {/* Proximity Sonar Radar Warning Badge */}
        {proximityDistance < 4.0 && (
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-mono-nums font-semibold tracking-wider backdrop-blur-md ${radarColor}`}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>SONAR {proximityDistance.toFixed(1)}m · {radarLabel}</span>
          </div>
        )}

        {/* Quick Actions (Camera, Reset, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onSwitchCamera}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 px-3 py-2 rounded-xl text-xs font-medium transition active:scale-95 shadow-md"
            title="Kamera ko‘rinishini almashtirish (C)"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline uppercase">{cameraMode}</span>
          </button>

          <button
            onClick={onToggleMinimap}
            className={`p-2 rounded-xl border transition active:scale-95 shadow-md ${
              showMinimap
                ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/80 text-slate-400 border-slate-700/60'
            }`}
            title="Minimap (M)"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCar}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 p-2 rounded-xl text-xs font-medium transition active:scale-95 shadow-md"
            title="Mashinani qayta tiklash (R)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onPause}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 px-3 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition active:scale-95 shadow-md"
            title="Pauza (ESC / P)"
          >
            PAUSE
          </button>
        </div>
      </header>

      {/* Middle Alerts: Parking Alignment Guidance & Hold Progress */}
      <div className="flex flex-col items-center justify-center pointer-events-none -mt-8">
        {inParkingZone && (
          <div className="bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-2.5 max-w-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm tracking-wide font-display">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              PARKING ZONE DETECTED
            </div>

            {/* Alignment Meter */}
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono-nums">
                <span>Alignment</span>
                <span className={alignmentScorePercent >= 80 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {alignmentScorePercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    alignmentScorePercent >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${alignmentScorePercent}%` }}
                />
              </div>
            </div>

            {/* Parked Hold Progress */}
            {parkingTimeProgress > 0 ? (
              <div className="w-full flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[11px] font-semibold text-emerald-300 font-mono-nums">
                  <span>Holding Position...</span>
                  <span>{Math.round(parkingTimeProgress * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${parkingTimeProgress * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center font-medium">
                {speedKmh > 0 ? "To'xtating va tekislang" : "Pozitsiyani ushlab turing"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Area: Minimap (Right) + Realistic Instrument Cluster (Center-Right/Bottom) */}
      <div className="flex items-end justify-between w-full pointer-events-none pb-1">
        {/* Left corner: damage and fuel indicators */}
        <div className="hidden sm:flex flex-col gap-2 bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 text-xs w-44 shadow-xl">
          {/* Damage */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300 font-mono-nums text-[11px]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" /> DAMAGE
              </span>
              <span className={damagePercent > 50 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                {damagePercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  damagePercent > 60 ? 'bg-rose-500' : damagePercent > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${damagePercent}%` }}
              />
            </div>
          </div>

          {/* Fuel */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-slate-300 font-mono-nums text-[11px]">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-cyan-400" /> FUEL
              </span>
              <span className="text-slate-400">{fuelPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${fuelPercent}%` }} />
            </div>
          </div>

          {/* Steering Angle Indicator */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono-nums border-t border-slate-800/60">
            <span>WHEEL</span>
            <span>{Math.round(steeringAngleNorm * 38)}°</span>
          </div>
        </div>

        {/* Center: Analog & Digital Dash Instrument Cluster */}
        <div className="mx-auto flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl">
          {/* RPM Dial */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#1e293b"
                strokeWidth="6"
                fill="none"
                strokeDasharray="210"
                strokeDashoffset="30"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={rpm > 5500 ? '#ef4444' : '#06b6d4'}
                strokeWidth="6"
                fill="none"
                strokeDasharray="210"
                strokeDashoffset={210 - (rpmRatio * 180)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-slate-400">RPM</span>
              <span className="font-mono-nums font-bold text-sm sm:text-base text-slate-100">
                {rpm}
              </span>
            </div>
          </div>

          {/* Gear & Status Center Column */}
          <div className="flex flex-col items-center justify-center px-2 py-1 min-w-[72px]">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">GEAR</div>
            <div className="text-3xl sm:text-4xl font-display font-extrabold text-amber-400 tracking-tight">
              {gearDisplay}
            </div>

            {/* Warning / Active Lights */}
            <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold font-mono">
              {handbrake && (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 rounded">
                  P-BRAKE
                </span>
              )}
              {isBraking && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded">
                  BRAKE
                </span>
              )}
              {isReversing && (
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 rounded">
                  REV
                </span>
              )}
            </div>
          </div>

          {/* Speedometer Dial */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#1e293b"
                strokeWidth="7"
                fill="none"
                strokeDasharray="210"
                strokeDashoffset="30"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#f59e0b"
                strokeWidth="7"
                fill="none"
                strokeDasharray="210"
                strokeDashoffset={210 - (speedRatio * 180)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-display font-black text-white font-mono-nums">
                {String(speedKmh).padStart(3, '0')}
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-400">KM/H</span>
            </div>
          </div>
        </div>

        {/* Right Corner: Minimap Radar */}
        {showMinimap && (
          <div className="hidden md:flex flex-col items-center bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2 shadow-2xl">
            <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              <span>MINIMAP</span>
            </div>
            <div className="relative w-28 h-28 bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800">
              <svg className="w-full h-full" viewBox="-25 -35 50 70">
                {/* Target Parking Box */}
                <rect
                  x={parkingTarget.x - parkingTarget.width / 2}
                  y={parkingTarget.z - parkingTarget.length / 2}
                  width={parkingTarget.width}
                  height={parkingTarget.length}
                  fill="#22c55e"
                  opacity="0.4"
                  stroke="#4ade80"
                  strokeWidth="0.8"
                />

                {/* Car Blip with Heading Arrow */}
                <g transform={`translate(${minimapCarPos.x}, ${minimapCarPos.z}) rotate(${(-minimapCarPos.rot * 180) / Math.PI})`}>
                  <rect x="-1" y="-2" width="2" height="4" fill="#38bdf8" rx="0.4" />
                  <polygon points="0,-3 -1.2,-1.5 1.2,-1.5" fill="#f59e0b" />
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
