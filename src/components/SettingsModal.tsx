import React, { useState, useEffect } from 'react';
import { GameSettings, ControlType, TransmissionType, KeyBindings } from '../types/game';
import { X, Sliders, Gamepad2, Volume2, RotateCcw, Check } from 'lucide-react';
import { DEFAULT_SETTINGS, DEFAULT_KEYBINDINGS } from '../game/constants';
import { sound } from '../services/sound';

interface SettingsModalProps {
  settings: GameSettings;
  onSaveSettings: (settings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'audio'>('controls');
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [editingBindingKey, setEditingBindingKey] = useState<keyof KeyBindings | null>(null);

  // Keybinding listener when remapping
  useEffect(() => {
    if (!editingBindingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newBindings = {
        ...settings.keybindings,
        [editingBindingKey]: e.code,
      };

      setSettings((prev) => ({
        ...prev,
        keybindings: newBindings,
      }));
      setEditingBindingKey(null);
      sound.playClick();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingBindingKey, settings.keybindings]);

  const handleControlChange = (type: ControlType) => {
    setSettings((prev) => ({ ...prev, controlType: type }));
    sound.playClick();
  };

  const handleTransmissionChange = (trans: TransmissionType) => {
    setSettings((prev) => ({ ...prev, transmission: trans }));
    sound.playClick();
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    sound.playClick();
  };

  const handleSaveAndClose = () => {
    onSaveSettings(settings);
    sound.setVolumes(settings.masterVolume, settings.sfxVolume, settings.engineVolume);
    onClose();
  };

  const BINDING_LABELS: Record<keyof KeyBindings, string> = {
    forward: 'Gaz / Oldinga (Forward)',
    backward: 'Tormoz / Orqaga (Brake / Reverse)',
    steerLeft: 'Chapga burilish (Steer Left)',
    steerRight: 'O‘ngga burilish (Steer Right)',
    handbrake: 'Qo‘l tormozi (Handbrake)',
    reset: 'Mashinani tiklash (Reset)',
    pause: 'Pauza (Pause)',
    camera: 'Kamera (Camera)',
    minimap: 'Minimap (Minimap)',
    gearUp: 'Gear Up (Manual)',
    gearDown: 'Gear Down (Manual)',
    gearReverse: 'Gear Reverse',
    gearNeutral: 'Gear Neutral',
    gear1: '1-uzatma (Gear 1)',
    gear2: '2-uzatma (Gear 2)',
    gear3: '3-uzatma (Gear 3)',
    gear4: '4-uzatma (Gear 4)',
    gear5: '5-uzatma (Gear 5)',
    gear6: '6-uzatma (Gear 6)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold font-display text-white">SOZLAMALAR & BOSHQARUV</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-4 text-xs font-bold font-display">
          <button
            onClick={() => setActiveTab('controls')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'controls'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>BOSHQARUV & KLAVIATURA</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>OVOZ & DISPLAY</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'controls' ? (
            <>
              {/* Transmission Choice */}
              <div>
                <label className="block text-slate-400 font-mono uppercase tracking-wider mb-2">
                  TRANSMISSIYA TIZIMI (TRANSMISSION)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTransmissionChange('automatic')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      settings.transmission === 'automatic'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-display text-sm">AVTOMAT (AUTOMATIC)</span>
                    <span className="text-[10px] opacity-80 font-mono">P - R - N - D uzatmalar</span>
                  </button>

                  <button
                    onClick={() => handleTransmissionChange('manual')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      settings.transmission === 'manual'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-display text-sm">MEXANIK (MANUAL)</span>
                    <span className="text-[10px] opacity-80 font-mono">1–6, N, R uzatmalar</span>
                  </button>
                </div>
              </div>

              {/* Mobile Control Type */}
              <div>
                <label className="block text-slate-400 font-mono uppercase tracking-wider mb-2">
                  TELEFON / MOBIL BOSHQARUV TURI (CONTROL TYPE)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'wheel', title: 'Virtual Rul', sub: 'Steering Wheel' },
                      { id: 'buttons', title: 'Tugmalar', sub: 'Left / Right' },
                      { id: 'gyro', title: 'Giroskop', sub: 'Tilt Sensor' },
                    ] as const
                  ).map((ctrl) => (
                    <button
                      key={ctrl.id}
                      onClick={() => handleControlChange(ctrl.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-0.5 transition ${
                        settings.controlType === ctrl.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-display text-xs">{ctrl.title}</span>
                      <span className="text-[9px] opacity-80 font-mono">{ctrl.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Steering Sensitivity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>RUL SEZGIRLIGI (STEERING SENSITIVITY)</span>
                  <span className="text-amber-400 font-bold">{settings.wheelSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.wheelSensitivity}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      wheelSensitivity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Remappable Keyboard Bindings Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400 font-mono uppercase tracking-wider">
                    KLAVIATURA TUGMALARI (KEYBINDINGS)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tugmani bosib yangisini bosing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 max-h-56 overflow-y-auto">
                  {(Object.keys(settings.keybindings) as (keyof KeyBindings)[]).map((keyName) => {
                    const isEditing = editingBindingKey === keyName;
                    const code = settings.keybindings[keyName];

                    return (
                      <div
                        key={keyName}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px]"
                      >
                        <span className="text-slate-300 truncate max-w-[130px]">
                          {BINDING_LABELS[keyName] || keyName}
                        </span>

                        <button
                          onClick={() => setEditingBindingKey(keyName)}
                          className={`px-2.5 py-1 rounded-lg font-mono font-bold transition text-xs border ${
                            isEditing
                              ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {isEditing ? 'Tugmani bosing...' : code.replace('Key', '').replace('Digit', '')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Audio Controls */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>ASOSIY OVOZ (MASTER VOLUME)</span>
                    <span className="text-amber-400 font-bold">{Math.round(settings.masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.masterVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        masterVolume: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>MOTOR OVOZI (ENGINE HUM)</span>
                    <span className="text-amber-400 font-bold">{Math.round(settings.engineVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.engineVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        engineVolume: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>SFX & SONAR RADAR</span>
                    <span className="text-amber-400 font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        sfxVolume: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Display Options */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <span className="text-slate-300 font-medium">RADAR MINIMAP KO‘RINISHI</span>
                  <input
                    type="checkbox"
                    checked={settings.showMinimap}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, showMinimap: e.target.checked }))
                    }
                    className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer">
                  <span className="text-slate-300 font-medium">DINAMIK SOYALAR (SHADOWS)</span>
                  <input
                    type="checkbox"
                    checked={settings.shadows}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, shadows: e.target.checked }))
                    }
                    className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-950">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>STANDART QILISH</span>
          </button>

          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>SAQLASH VA CHIQISH</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
