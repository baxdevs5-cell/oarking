import React, { useState } from 'react';
import { VehicleConfig } from '../types/game';
import { ArrowLeft, Check, Lock, Zap, Gauge, Shield, RotateCw } from 'lucide-react';

interface GarageMenuProps {
  vehicles: VehicleConfig[];
  unlockedCarIds: string[];
  selectedCarId: string;
  coins: number;
  onSelectCar: (carId: string) => void;
  onUnlockCar: (carId: string, price: number) => void;
  onUpdateCarColor: (carId: string, color: string) => void;
  onBack: () => void;
}

const AVAILABLE_COLORS = [
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Racing Red', hex: '#dc2626' },
  { name: 'Gunmetal Slate', hex: '#475569' },
  { name: 'Speed Yellow', hex: '#eab308' },
  { name: 'Obsidian Black', hex: '#18181b' },
  { name: 'Emerald Peak', hex: '#059669' },
  { name: 'Pearl White', hex: '#f8fafc' },
];

export const GarageMenu: React.FC<GarageMenuProps> = ({
  vehicles,
  unlockedCarIds,
  selectedCarId,
  coins,
  onSelectCar,
  onUnlockCar,
  onUpdateCarColor,
  onBack,
}) => {
  const [activeCarId, setActiveCarId] = useState(selectedCarId);
  const activeCar = vehicles.find((v) => v.id === activeCarId) || vehicles[0];
  const isUnlocked = unlockedCarIds.includes(activeCar.id);
  const isSelected = selectedCarId === activeCar.id;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 md:p-8 bg-slate-950 text-slate-100 overflow-y-auto select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Orqaga</span>
        </button>

        <h1 className="text-xl md:text-2xl font-black font-display tracking-wider text-amber-400">
          GARAJ & AVTOMOBILLAR
        </h1>

        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono-nums font-bold text-amber-400">
          {coins} COINS
        </div>
      </header>

      {/* Main Showcase Section */}
      <div className="my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto w-full">
        {/* Left: Vehicle Carousel Selector */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
            Modellar tanlovi
          </div>
          {vehicles.map((v) => {
            const unlocked = unlockedCarIds.includes(v.id);
            const active = v.id === activeCarId;

            return (
              <button
                key={v.id}
                onClick={() => setActiveCarId(v.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${
                  active
                    ? 'bg-slate-800 border-amber-400/80 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-slate-400">{v.brand}</span>
                  <span className="text-sm font-bold text-white font-display">{v.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!unlocked ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-mono-nums font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      {v.price}
                    </span>
                  ) : selectedCarId === v.id ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                      FAOL
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Ochiq</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Vehicle Specs & Color Customization */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800/90 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                {activeCar.category} · {activeCar.brand}
              </span>
              <h2 className="text-3xl font-black font-display text-white mt-0.5">
                {activeCar.name}
              </h2>
            </div>

            {/* Selection / Purchase Action */}
            <div>
              {!isUnlocked ? (
                <button
                  onClick={() => onUnlockCar(activeCar.id, activeCar.price)}
                  disabled={coins < activeCar.price}
                  className={`px-6 py-3 rounded-2xl font-display font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95 ${
                    coins >= activeCar.price
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>SOTIB OLISH ({activeCar.price} C)</span>
                </button>
              ) : isSelected ? (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 rounded-2xl text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>TANLANGAN MASHINA</span>
                </div>
              ) : (
                <button
                  onClick={() => onSelectCar(activeCar.id)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-sm rounded-2xl shadow-lg transition active:scale-95"
                >
                  MINISH (TANLASH)
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {activeCar.description}
          </p>

          {/* Performance Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" /> MAX TEZLIK
              </span>
              <span className="text-lg font-bold font-mono-nums text-white">
                {activeCar.specs.topSpeedKmh} <span className="text-xs text-slate-400 font-normal">km/h</span>
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> TEZLANISH
              </span>
              <span className="text-lg font-bold font-mono-nums text-white">
                {activeCar.specs.acceleration} <span className="text-xs text-slate-400 font-normal">/ 10</span>
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" /> TORMOZ KUCHI
              </span>
              <span className="text-lg font-bold font-mono-nums text-white">
                {activeCar.specs.braking} <span className="text-xs text-slate-400 font-normal">/ 10</span>
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" /> BURILISH BURCHAGI
              </span>
              <span className="text-lg font-bold font-mono-nums text-white">
                {activeCar.specs.steeringLockDeg}°
              </span>
            </div>
          </div>

          {/* Paint Customization */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
              Kuzov rangi (Paint Finish)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {AVAILABLE_COLORS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => onUpdateCarColor(activeCar.id, col.hex)}
                  className={`w-9 h-9 rounded-full border-2 transition transform active:scale-90 ${
                    activeCar.color === col.hex
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
        Har bir muvaffaqiyatli to‘xtash uchun tangalar oling va yangi sportkarlarni oching.
      </footer>
    </div>
  );
};
