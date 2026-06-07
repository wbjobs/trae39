import { useState } from 'react';
import { Play, Pause, RotateCcw, Gauge, ChevronDown, ChevronUp } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

export const SimulationControls = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    simulationState,
    simulationParams,
    togglePause,
    resetSimulation,
    setSimulationSpeed,
    updateSimulationParams,
  } = useSimulationStore();

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-cyan-400 font-semibold text-sm">模拟控制</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={togglePause}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                simulationState.isPaused
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
              }`}
            >
              {simulationState.isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  继续
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  暂停
                </>
              )}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-3 h-3 text-slate-400" />
              <label className="text-xs text-slate-400">
                模拟速度: {simulationState.simulationSpeed.toFixed(1)}x
              </label>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={simulationState.simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.1x</span>
              <span>1x</span>
              <span>5x</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                时间步长: {simulationParams.timeStep.toFixed(5)}
              </label>
              <input
                type="range"
                min="0.0001"
                max="0.002"
                step="0.0001"
                value={simulationParams.timeStep}
                onChange={(e) =>
                  updateSimulationParams({ timeStep: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                LJ ε (epsilon): {simulationParams.ljEpsilon.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={simulationParams.ljEpsilon}
                onChange={(e) =>
                  updateSimulationParams({ ljEpsilon: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                LJ σ (sigma): {simulationParams.ljSigma.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={simulationParams.ljSigma}
                onChange={(e) =>
                  updateSimulationParams({ ljSigma: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                阻尼系数: {simulationParams.damping.toFixed(4)}
              </label>
              <input
                type="range"
                min="0"
                max="0.01"
                step="0.0001"
                value={simulationParams.damping}
                onChange={(e) =>
                  updateSimulationParams({ damping: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>模拟时间:</span>
              <span className="text-cyan-400 font-mono">
                {simulationState.currentTime.toFixed(3)} ps
              </span>
            </div>
            <div className="flex justify-between">
              <span>原子数量:</span>
              <span className="text-slate-300 font-mono">
                {useSimulationStore.getState().atoms.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
