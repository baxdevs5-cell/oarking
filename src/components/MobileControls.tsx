import React, { useState, useEffect, useRef } from 'react';
import { ControlType, TransmissionType, AutoGear } from '../types/game';
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Compass, RotateCcw } from 'lucide-react';

interface MobileControlsProps {
  controlType: ControlType;
  transmission: TransmissionType;
  autoGear: AutoGear;
  currentManualGear: number;
  onSteerChange: (val: number) => void;
  onThrottleChange: (val: number) => void;
  onBrakeChange: (val: number) => void;
  onHandbrakeToggle: (active: boolean) => void;
  onSetAutoGear: (gear: AutoGear) => void;
  onShiftManualUp: () => void;
  onShiftManualDown: () => void;
  onSetManualGear: (gear: number) => void;
  onFallbackToWheel?: () => void;
  sensitivity?: number;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  controlType,
  transmission,
  autoGear,
  currentManualGear,
  onSteerChange,
  onThrottleChange,
  onBrakeChange,
  onHandbrakeToggle,
  onSetAutoGear,
  onShiftManualUp,
  onShiftManualDown,
  onSetManualGear,
  onFallbackToWheel,
  sensitivity = 1.0,
}) => {
  // Virtual Steering Wheel states
  const wheelRef = useRef<HTMLDivElement>(null);
  const [wheelAngle, setWheelAngle] = useState(0); // -180 to 180 degrees
  const isDraggingWheel = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const lastAngle = useRef(0);
  const springAnimFrame = useRef<number | null>(null);

  // Pedals active visual state
  const [isGasPressed, setIsGasPressed] = useState(false);
  const [isBrakePressed, setIsBrakePressed] = useState(false);
  const [isHandbrakeActive, setIsHandbrakeActive] = useState(false);

  // Button Mode states
  const [isLeftPressed, setIsLeftPressed] = useState(false);
  const [isRightPressed, setIsRightPressed] = useState(false);

  // Gyroscope tilt
  const [gyroAngle, setGyroAngle] = useState(0);
  const [gyroSupported, setGyroSupported] = useState(true);

  // 1. Gyroscope logic
  useEffect(() => {
    if (controlType !== 'gyro') return;

    let hasReceivedEvent = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      hasReceivedEvent = true;
      // gamma is tilt left-to-right in degrees (-90 to +90)
      if (e.gamma !== null) {
        // Clamp to -40 to 40 degrees
        const tilt = Math.max(-40, Math.min(40, e.gamma));
        const normalized = (tilt / 35) * sensitivity;
        setGyroAngle(tilt);
        onSteerChange(Math.max(-1, Math.min(1, normalized)));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // If no gyro event within 1.5 seconds, fallback to wheel
    const timeout = setTimeout(() => {
      if (!hasReceivedEvent) {
        setGyroSupported(false);
        if (onFallbackToWheel) onFallbackToWheel();
      }
    }, 1500);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearTimeout(timeout);
    };
  }, [controlType, sensitivity, onSteerChange, onFallbackToWheel]);

  // 2. Button mode steer update
  useEffect(() => {
    if (controlType !== 'buttons') return;

    if (isLeftPressed && !isRightPressed) {
      onSteerChange(-1.0);
    } else if (isRightPressed && !isLeftPressed) {
      onSteerChange(1.0);
    } else {
      onSteerChange(0);
    }
  }, [controlType, isLeftPressed, isRightPressed, onSteerChange]);

  // 3. Virtual Steering Wheel Pointer Events
  const handleWheelPointerDown = (e: React.PointerEvent) => {
    if (!wheelRef.current) return;
    isDraggingWheel.current = true;
    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (springAnimFrame.current) {
      cancelAnimationFrame(springAnimFrame.current);
    }

    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastAngle.current = angleRad;
  };

  const handleWheelPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingWheel.current || e.pointerId !== activePointerId.current || !wheelRef.current) return;

    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    let delta = angleRad - lastAngle.current;
    // Normalize delta wrap
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    lastAngle.current = angleRad;

    setWheelAngle((prev) => {
      const nextDeg = Math.max(-180, Math.min(180, prev + (delta * 180) / Math.PI));
      const steerNorm = (nextDeg / 180) * sensitivity;
      onSteerChange(Math.max(-1, Math.min(1, steerNorm)));
      return nextDeg;
    });
  };

  const handleWheelPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    isDraggingWheel.current = false;
    activePointerId.current = null;

    // Spring return animation
    const animateSpring = () => {
      setWheelAngle((prev) => {
        if (Math.abs(prev) < 2) {
          onSteerChange(0);
          return 0;
        }
        const next = prev * 0.78; // return damping
        onSteerChange((next / 180) * sensitivity);
        springAnimFrame.current = requestAnimationFrame(animateSpring);
        return next;
      });
    };
    springAnimFrame.current = requestAnimationFrame(animateSpring);
  };

  // Gas handlers
  const handleGasDown = () => {
    setIsGasPressed(true);
    onThrottleChange(1.0);
  };
  const handleGasUp = () => {
    setIsGasPressed(false);
    onThrottleChange(0);
  };

  // Brake handlers
  const handleBrakeDown = () => {
    setIsBrakePressed(true);
    onBrakeChange(1.0);
  };
  const handleBrakeUp = () => {
    setIsBrakePressed(false);
    onBrakeChange(0);
  };

  // Handbrake handler
  const handleHandbrakeClick = () => {
    const next = !isHandbrakeActive;
    setIsHandbrakeActive(next);
    onHandbrakeToggle(next);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex justify-between items-end p-4 md:p-6 overflow-hidden select-none">
      {/* LEFT ZONE: Steering Controls */}
      <div className="pointer-events-auto flex flex-col items-center">
        {/* Virtual Steering Wheel Mode */}
        {controlType === 'wheel' && (
          <div className="flex flex-col items-center">
            <div
              ref={wheelRef}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-slate-700 bg-slate-900/85 backdrop-blur-md shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
              style={{
                transform: `rotate(${wheelAngle}deg)`,
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.7), inset 0 0 15px rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Outer wheel grip ring */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-slate-600/60 pointer-events-none" />

              {/* Top center marker */}
              <div className="absolute top-1.5 w-3 h-5 bg-amber-400 rounded-sm shadow-md pointer-events-none" />

              {/* Three Spokes */}
              <div className="absolute w-full h-3 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 pointer-events-none" />
              <div className="absolute w-3 h-full bg-gradient-to-b from-transparent via-slate-800 to-slate-700 pointer-events-none" />

              {/* Center Emblem Hub */}
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-amber-500/80 shadow-inner flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-extrabold font-display tracking-widest text-amber-400">PRK</span>
              </div>
            </div>
            <span className="mt-1 text-[11px] font-mono text-slate-400 font-semibold tracking-wider">
              {Math.round(wheelAngle)}° RUL
            </span>
          </div>
        )}

        {/* Buttons Mode */}
        {controlType === 'buttons' && (
          <div className="flex items-center gap-3">
            <button
              onPointerDown={() => setIsLeftPressed(true)}
              onPointerUp={() => setIsLeftPressed(false)}
              onPointerLeave={() => setIsLeftPressed(false)}
              onPointerCancel={() => setIsLeftPressed(false)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-bold transition shadow-xl touch-none ${
                isLeftPressed
                  ? 'bg-amber-500 text-slate-950 border-amber-300 scale-95 shadow-amber-500/30'
                  : 'bg-slate-900/85 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <ArrowLeft className="w-8 h-8" />
              <span className="text-[10px] font-mono tracking-widest mt-0.5">CHAP</span>
            </button>

            <button
              onPointerDown={() => setIsRightPressed(true)}
              onPointerUp={() => setIsRightPressed(false)}
              onPointerLeave={() => setIsRightPressed(false)}
              onPointerCancel={() => setIsRightPressed(false)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-bold transition shadow-xl touch-none ${
                isRightPressed
                  ? 'bg-amber-500 text-slate-950 border-amber-300 scale-95 shadow-amber-500/30'
                  : 'bg-slate-900/85 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <ArrowRight className="w-8 h-8" />
              <span className="text-[10px] font-mono tracking-widest mt-0.5">O‘NG</span>
            </button>
          </div>
        )}

        {/* Gyroscope Mode Indicator */}
        {controlType === 'gyro' && (
          <div className="flex flex-col items-center bg-slate-900/85 backdrop-blur-md border border-slate-700 p-3 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <Compass className="w-4 h-4" />
              <span>GYRO SENSOR</span>
            </div>
            <div className="w-32 h-6 bg-slate-800 rounded-full flex items-center justify-center relative overflow-hidden border border-slate-700">
              <div
                className="w-4 h-4 rounded-full bg-cyan-400 absolute transition-all duration-75 shadow-md"
                style={{ transform: `translateX(${gyroAngle * 1.4}px)` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-nums mt-1">
              {Math.round(gyroAngle)}° Tilt
            </span>
          </div>
        )}
      </div>

      {/* RIGHT ZONE: Pedals & Transmission Shifter */}
      <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
        {/* Transmission Controls */}
        <div className="flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-2 rounded-2xl shadow-xl">
          {transmission === 'automatic' ? (
            // P - R - N - D automatic gear buttons
            (['P', 'R', 'N', 'D'] as AutoGear[]).map((gear) => (
              <button
                key={gear}
                onClick={() => onSetAutoGear(gear)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display font-bold text-sm transition active:scale-95 flex items-center justify-center ${
                  autoGear === gear
                    ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                {gear}
              </button>
            ))
          ) : (
            // Manual Gearbox Shifter (+ / -)
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onShiftManualUp}
                className="w-11 h-11 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center justify-center active:scale-95"
                title="Gear Up"
              >
                <ChevronUp className="w-5 h-5 text-emerald-400" />
              </button>

              <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 font-display font-extrabold text-sm flex items-center justify-center shadow-md">
                {currentManualGear === -1 ? 'R' : currentManualGear === 0 ? 'N' : `M${currentManualGear}`}
              </div>

              <button
                onClick={onShiftManualDown}
                className="w-11 h-11 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center justify-center active:scale-95"
                title="Gear Down"
              >
                <ChevronDown className="w-5 h-5 text-amber-400" />
              </button>
            </div>
          )}

          {/* Handbrake Button */}
          <button
            onClick={handleHandbrakeClick}
            className={`w-11 h-11 sm:w-12 sm:h-12 mt-1 rounded-xl font-mono text-[10px] font-extrabold flex flex-col items-center justify-center transition border active:scale-95 ${
              isHandbrakeActive
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>(P)</span>
            <span className="text-[8px]">HAND</span>
          </button>
        </div>

        {/* BRAKE PEDAL */}
        <button
          onPointerDown={handleBrakeDown}
          onPointerUp={handleBrakeUp}
          onPointerLeave={handleBrakeUp}
          onPointerCancel={handleBrakeUp}
          className={`w-16 h-28 sm:w-20 sm:h-36 rounded-2xl border-2 flex flex-col items-center justify-between py-3 font-display font-black tracking-wider transition shadow-2xl touch-none ${
            isBrakePressed
              ? 'bg-rose-500 text-slate-950 border-rose-300 translate-y-1 shadow-rose-500/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          {/* Grip treads */}
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-lg">BRAKE</span>
            <span className="text-[10px] font-mono text-slate-400">/ REV</span>
          </div>
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </button>

        {/* GAS PEDAL */}
        <button
          onPointerDown={handleGasDown}
          onPointerUp={handleGasUp}
          onPointerLeave={handleGasUp}
          onPointerCancel={handleGasUp}
          className={`w-16 h-36 sm:w-20 sm:h-44 rounded-2xl border-2 flex flex-col items-center justify-between py-4 font-display font-black tracking-wider transition shadow-2xl touch-none ${
            isGasPressed
              ? 'bg-emerald-500 text-slate-950 border-emerald-300 translate-y-2 shadow-emerald-500/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          {/* Grip treads */}
          <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
          <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
          <span className="text-lg sm:text-xl text-emerald-400">GAS</span>
          <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
          <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
        </button>
      </div>
    </div>
  );
};
