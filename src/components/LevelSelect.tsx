import React from 'react';
import { LevelConfig, LevelProgress } from '../types/game';
import { ArrowLeft, Play, Lock, Star, Clock } from 'lucide-react';

interface LevelSelectProps {
  levels: LevelConfig[];
  progress: Record<number, LevelProgress>;
  currentLevelId: number;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  levels,
  progress,
  currentLevelId,
  onSelectLevel,
  onBack,
}) => {
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
          PARKOVKA MISSIYALARI
        </h1>

        <div className="text-xs text-slate-400 font-mono">
          6 TA BOSQICH
        </div>
      </header>

      {/* Levels Grid */}
      <main className="my-auto py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto w-full">
        {levels.map((lvl) => {
          const prog = progress[lvl.id];
          const isUnlocked = lvl.id === 1 || !!prog;
          const isCompleted = prog?.completed;
          const stars = prog?.stars || 0;

          return (
            <div
              key={lvl.id}
              className={`flex flex-col justify-between p-5 rounded-2xl border transition relative overflow-hidden ${
                isUnlocked
                  ? 'bg-slate-900/80 border-slate-800 hover:border-amber-400/50 shadow-xl'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div>
                {/* Header row with Level Number & Difficulty */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                    BOSQICH 0{lvl.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono ${
                      lvl.difficulty === 'Easy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : lvl.difficulty === 'Medium'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : lvl.difficulty === 'Hard'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {lvl.difficulty}
                  </span>
                </div>

                <h3 className="text-lg font-bold font-display text-white mb-1">
                  {lvl.title.replace(/^Level \d+: /, '')}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">
                  {lvl.subtitle}
                </p>

                {/* Stars & Par Time */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono-nums mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((starNum) => (
                      <Star
                        key={starNum}
                        className={`w-4 h-4 ${
                          starNum <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lvl.parTimeSeconds}s par</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {isUnlocked ? (
                <button
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`w-full py-2.5 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                    isCompleted
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isCompleted ? 'QAYTA O‘YNASH' : 'BOSHLASH'}</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900/40 text-slate-600 font-mono text-xs border border-slate-900">
                  <Lock className="w-3.5 h-3.5" />
                  <span>QULFLANGAN</span>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <footer className="text-center text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
        Ketma-ket bosqichlarni muvaffaqiyatli yakunlab yangilarini oching.
      </footer>
    </div>
  );
};
