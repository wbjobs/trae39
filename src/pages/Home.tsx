import { useState, useEffect, useCallback } from 'react';
import { Atom, Eye, EyeOff, Keyboard, Info } from 'lucide-react';
import { MoleculeScene } from '../components/Scene/MoleculeScene';
import { AtomControls } from '../components/ControlPanel/AtomControls';
import { SimulationControls } from '../components/ControlPanel/SimulationControls';
import { EnergyDisplay } from '../components/ControlPanel/EnergyDisplay';
import { DataManagement } from '../components/ControlPanel/DataManagement';
import { useSimulationStore } from '../store/useSimulationStore';
import type { ElementType } from '../types';

export default function Home() {
  const [showLabels, setShowLabels] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const { togglePause, resetSimulation, setSelectedElementType, selectedAtomId, removeAtom } =
    useSimulationStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePause();
          break;
        case 'KeyR':
          e.preventDefault();
          resetSimulation();
          break;
        case 'Digit1':
          setSelectedElementType('H' as ElementType);
          break;
        case 'Digit2':
          setSelectedElementType('O' as ElementType);
          break;
        case 'Digit3':
          setSelectedElementType('C' as ElementType);
          break;
        case 'Digit4':
          setSelectedElementType('N' as ElementType);
          break;
        case 'KeyL':
          setShowLabels((prev) => !prev);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedAtomId) {
            removeAtom(selectedAtomId);
          }
          break;
      }
    },
    [togglePause, resetSimulation, setSelectedElementType, selectedAtomId, removeAtom],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-[#0a192f] text-white overflow-hidden relative">
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-3 flex items-center justify-between bg-gradient-to-b from-slate-900/90 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Atom className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              分子动力学模拟器
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              Molecular Dynamics Simulator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-xs text-slate-300 transition-colors border border-slate-700/50"
            title="显示/隐藏原子标签"
          >
            {showLabels ? (
              <Eye className="w-4 h-4 text-cyan-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-slate-500" />
            )}
            标签
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-xs text-slate-300 transition-colors border border-slate-700/50"
            title="键盘快捷键"
          >
            <Keyboard className="w-4 h-4" />
            快捷键
          </button>
        </div>
      </header>

      {showHelp && (
        <div className="absolute top-20 right-6 z-20 w-72 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-400">键盘快捷键</span>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">Space</kbd>
              <span className="text-slate-400">暂停/继续</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">R</kbd>
              <span className="text-slate-400">重置模拟</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">1</kbd>
              <span className="text-slate-400">选择 H 原子</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">2</kbd>
              <span className="text-slate-400">选择 O 原子</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">3</kbd>
              <span className="text-slate-400">选择 C 原子</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">4</kbd>
              <span className="text-slate-400">选择 N 原子</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">L</kbd>
              <span className="text-slate-400">显示/隐藏标签</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">Delete</kbd>
              <span className="text-slate-400">删除选中原子</span>
            </div>
            <div className="pt-2 border-t border-slate-700/50 mt-2">
              <p className="text-slate-500 text-[10px]">
                鼠标左键: 旋转视角 | 滚轮: 缩放 | 右键: 平移
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                暂停后双击场景: 在点击位置添加原子
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-20 bottom-4 z-10 w-72 flex flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <EnergyDisplay />
        <AtomControls />
        <SimulationControls />
        <DataManagement />
      </div>

      <div className="absolute inset-0">
        <MoleculeScene showLabels={showLabels} />
      </div>

      <footer className="absolute bottom-0 left-0 right-0 z-10 px-6 py-2 flex items-center justify-between bg-gradient-to-t from-slate-900/90 to-transparent">
        <div className="text-[10px] text-slate-500 font-mono">
          使用 Three.js + Velocity Verlet 积分 + Lennard-Jones 势
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>
            <span className="text-slate-400">相互作用:</span> 弹簧键 + 范德华力
          </span>
          <span>
            <span className="text-slate-400">积分器:</span> Velocity Verlet
          </span>
        </div>
      </footer>
    </div>
  );
}
