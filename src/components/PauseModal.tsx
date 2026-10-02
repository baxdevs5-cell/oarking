import React from 'react';
import { Play, RotateCcw, Settings, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 flex flex-col items-center text-center shadow-2xl">
        <h2 className="text-2xl font-black font-display text-white mb-1">
          PAUZA (TO‘XTATILDI)
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-mono">
          ESC yoki P bilan davom etishingiz mumkin
        </p>

        <div className="flex flex-col w-full gap-3 text-xs font-display font-bold">
          <button
            onClick={onResume}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>DAVOM ETISH (RESUME)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>QAYTA BOSHLASH (RESTART)</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>SOZLAMALAR & BOSHQARUV</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>ASOSIY MENYU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
