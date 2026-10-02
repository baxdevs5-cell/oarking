import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Clock, Shield, Coins, ArrowRight, RotateCcw, Home } from 'lucide-react';

interface GameSuccessModalProps {
  levelTitle: string;
  timeTaken: number;
  parTime: number;
  damagePercent: number;
  accuracyPercent: number;
  coinsEarned: number;
  stars: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onHome: () => void;
}

export const GameSuccessModal: React.FC<GameSuccessModalProps> = ({
  levelTitle,
  timeTaken,
  parTime,
  damagePercent,
  accuracyPercent,
  coinsEarned,
  stars,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onHome,
}) => {
  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#f59e0b', '#38bdf8', '#ffffff'],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 md:p-8 flex flex-col items-center text-center shadow-2xl">
        {/* Celebration Title */}
        <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
          MUVAFFAQIYATLI TO‘XTATILDI!
        </span>
        <h2 className="text-2xl md:text-3xl font-black font-display text-white mt-1 mb-2">
          A‘LO DARAJADA PARK!
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-medium">{levelTitle}</p>

        {/* Stars */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((starNum) => (
            <div
              key={starNum}
              className={`p-2 rounded-2xl border transition transform duration-300 ${
                starNum <= stars
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-400 scale-110'
                  : 'bg-slate-950/50 border-slate-800 text-slate-700'
              }`}
            >
              <Star className="w-8 h-8 fill-current" />
            </div>
          ))}
        </div>

        {/* Mission Stats Breakdown */}
        <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3 text-xs mb-6">
          <div className="flex items-center justify-between font-mono-nums">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Ketgan vaqt
            </span>
            <span className="font-bold text-white">
              {timeTaken.toFixed(1)}s <span className="text-[10px] text-slate-500">({parTime}s par)</span>
            </span>
          </div>

          <div className="flex items-center justify-between font-mono-nums">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> Tekislik aniqligi
            </span>
            <span className="font-bold text-emerald-400">{accuracyPercent}%</span>
          </div>

          <div className="flex items-center justify-between font-mono-nums">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-400" /> Zararlanish
            </span>
            <span className="font-bold text-slate-300">{damagePercent}%</span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono-nums text-amber-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> Mukofot
            </span>
            <span className="text-sm">+{coinsEarned} COINS</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          {hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
            >
              <span>KEYINGI BOSQICH</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5 w-full">
            <button
              onClick={onReplay}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>QAYTA O‘YNASH</span>
            </button>

            <button
              onClick={onHome}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>ASOSIY MENYU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
