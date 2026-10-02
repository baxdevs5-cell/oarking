import React from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface GameFailedModalProps {
  levelTitle: string;
  reason?: string;
  onRestart: () => void;
  onHome: () => void;
}

export const GameFailedModal: React.FC<GameFailedModalProps> = ({
  levelTitle,
  reason = 'Avtomobil jiddiy to‘qnashuv oqibatida ishdan chiqdi!',
  onRestart,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-rose-900/60 rounded-3xl max-w-sm w-full p-6 md:p-8 flex flex-col items-center text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-rose-500 uppercase">
          MISSIYA MUVAFFAQIYATSIZ
        </span>
        <h2 className="text-2xl font-black font-display text-white mt-1 mb-2">
          HALOKAT! (CRASHED)
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
          {reason}
        </p>

        <div className="flex flex-col w-full gap-2.5 text-xs font-display font-bold">
          <button
            onClick={onRestart}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            <span>QAYTA URINISH (RESTART)</span>
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
