import React, { useState } from 'react';
import { Play, Car, ListOrdered, Settings, HelpCircle, Coins, Award } from 'lucide-react';
import { VehicleConfig } from '../types/game';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenLevels: () => void;
  onOpenSettings: () => void;
  selectedCar: VehicleConfig;
  coins: number;
  totalStars: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenGarage,
  onOpenLevels,
  onOpenSettings,
  selectedCar,
  coins,
  totalStars,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 md:p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 select-none">
      {/* Background Graphic Lines */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06)_0%,transparent_70%)]" />
      </div>

      {/* Top Bar: Currency & Stats */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl md:text-2xl font-black font-display tracking-widest text-amber-400">
            PARCKING
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-wider hidden sm:inline">
            3D DRIVING & PARKING ACADEMY
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono-nums shadow-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-300">{coins}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono-nums shadow-sm">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-emerald-300">{totalStars} ★</span>
          </div>
        </div>
      </header>

      {/* Center Hero Title & Vehicle Highlight */}
      <main className="relative z-10 my-auto flex flex-col items-center text-center max-w-xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight text-white mb-2">
          REAL <span className="text-amber-400">PARKING</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-normal max-w-md mb-8">
          Haqiqiy avtomobil fizikasi, reallikdagi burilish geometriyasi va professional boshqaruv tizimi.
        </p>

        {/* Selected Vehicle Badge */}
        <div className="flex items-center gap-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl px-5 py-3 mb-8 shadow-xl backdrop-blur-md">
          <Car className="w-5 h-5 text-cyan-400" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Hozirgi mashina</div>
            <div className="text-sm font-bold text-white font-display">{selectedCar.brand} {selectedCar.name}</div>
          </div>
          <button
            onClick={onOpenGarage}
            className="ml-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4"
          >
            Almashtirish
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={onStartGame}
            className="w-full sm:w-auto px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-base md:text-lg rounded-2xl shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2.5 transition active:scale-95"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>O‘YINNI BOSHLASH</span>
          </button>

          <button
            onClick={onOpenLevels}
            className="w-full sm:w-auto px-6 py-4 bg-slate-900/90 hover:bg-slate-800 text-white font-display font-bold text-base rounded-2xl border border-slate-700/80 shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
          >
            <ListOrdered className="w-5 h-5 text-emerald-400" />
            <span>MISSIYALAR</span>
          </button>
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenGarage}
            className="flex items-center gap-2 hover:text-white transition py-1 font-medium"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            <span>Garaj / Mashinalar</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 hover:text-white transition py-1 font-medium"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Sozlamalar & Boshqaruv</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 hover:text-white transition py-1 font-medium"
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
            <span>Qo‘llanma</span>
          </button>
        </div>

        <div className="font-mono text-[11px] text-slate-500">
          Desktop Keyboard & Mobile Wheel Ready
        </div>
      </footer>

      {/* How To Play Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>O‘yinni Boshqarish Qo‘llanmasi</span>
            </h2>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-1">
                  Kompyuter (Klaviatura):
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono-nums">
                  <div><strong className="text-white">W</strong> — Gaz / Oldinga</div>
                  <div><strong className="text-white">S</strong> — Tormoz / Orqaga</div>
                  <div><strong className="text-white">A / D</strong> — Chap / O‘ng burilish</div>
                  <div><strong className="text-white">SPACE</strong> — Qo‘l tormozi</div>
                  <div><strong className="text-white">R</strong> — Mashinani qayta tiklash</div>
                  <div><strong className="text-white">C</strong> — Kamera almashtirish</div>
                  <div><strong className="text-white">M</strong> — Minimap</div>
                  <div><strong className="text-white">1–6</strong> — Manual uzatmalar</div>
                  <div><strong className="text-white">N / G</strong> — Neytral / Reverse</div>
                  <div><strong className="text-white">P / ESC</strong> — Pauza</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] mb-1">
                  Telefon / Mobil:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Virtual Rul:</strong> Barmoq bilan rulni aylantiring, qo‘yib yuborganda o‘zi markazga qaytadi.</li>
                  <li><strong>Pedallar:</strong> O‘ng tarafda GAS va BRAKE pedallarini bosib turing.</li>
                  <li><strong>Sensor (Gyro):</strong> Sozlamalardan Gyroscope rejimini yoqib, telefonni qiya qilib burishingiz mumkin!</li>
                  <li><strong>P/R/N/D:</strong> Avtomat uzatmalarni teginish orqali almashtiring.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition font-display"
            >
              TUSHUNDIM
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
