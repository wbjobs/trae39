import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Gauge, ChevronDown, ChevronUp, Cpu, Zap, Activity } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { usePhysics } from '../../hooks/usePhysics';
import type { SimulationParams } from '../../types';

export const SimulationControls = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fps, setFps] = useState(60);
  const {
    simulationState,
    simulationParams,
    togglePause,
    resetSimulation,
    setSimulationSpeed,
    updateSimulationParams,
  } = useSimulationStore();

  const { isWorkerEnabled, toggleWorker, workerStats, workerInitialized } = usePhysics();

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const updateFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animationId = requestAnimationFrame(updateFps);
    };

    animationId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

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
                力阻尼系数: {simulationParams.damping.toFixed(4)}
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

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                速度阻尼因子: {simulationParams.velocityDamping.toFixed(4)}
              </label>
              <input
                type="range"
                min="0.95"
                max="1.0"
                step="0.001"
                value={simulationParams.velocityDamping}
                onChange={(e) =>
                  updateSimulationParams({ velocityDamping: parseFloat(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>强阻尼 (0.95)</span>
                <span>无阻尼 (1.0)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/50">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>性能统计</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Activity className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] text-slate-400">帧率</span>
                    </div>
                    <div className={`text-sm font-mono ${fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {fps} FPS
                    </div>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">步长时间</span>
                    </div>
                    <div className="text-sm font-mono text-cyan-400">
                      {workerStats.lastStepTime.toFixed(1)} ms
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Cpu className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-slate-400">LJ对数</span>
                    </div>
                    <div className="text-sm font-mono text-purple-400">
                      {workerStats.ljPairCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Gauge className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-slate-400">平均耗时</span>
                    </div>
                    <div className="text-sm font-mono text-orange-400">
                      {workerStats.avgStepTime.toFixed(1)} ms
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">Web Worker</span>
                    </div>
                    <button
                      onClick={toggleWorker}
                      className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                        isWorkerEnabled
                          ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {isWorkerEnabled ? '已启用' : '已禁用'}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    状态: {workerInitialized ? (
                      <span className="text-green-400">已初始化</span>
                    ) : (
                      <span className="text-yellow-400">初始化中...</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    处理步数: {workerStats.stepsProcessed.toLocaleString()}
                  </div>
                </div>

                <div className="text-[9px] text-slate-500 bg-slate-900/50 p-2 rounded-lg">
                  <p>• 空间哈希: O(N) 复杂度，适用于 100+ 原子</p>
                  <p>• Web Worker: 物理计算与渲染分离</p>
                  <p>• 目标: 1000 原子 @ 60 FPS</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-700/50 text-[10px] text-slate-500">
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
