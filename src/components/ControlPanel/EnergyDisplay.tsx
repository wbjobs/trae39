import { useState, useEffect } from 'react';
import { Zap, ThermometerSun, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

interface EnergyHistory {
  kinetic: number;
  potential: number;
  total: number;
}

export const EnergyDisplay = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [history, setHistory] = useState<EnergyHistory[]>([]);
  const { simulationState } = useSimulationStore();

  useEffect(() => {
    setHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          kinetic: simulationState.kineticEnergy,
          potential: simulationState.potentialEnergy,
          total: simulationState.totalEnergy,
        },
      ];
      return newHistory.slice(-60);
    });
  }, [
    simulationState.kineticEnergy,
    simulationState.potentialEnergy,
    simulationState.totalEnergy,
  ]);

  const maxEnergy = Math.max(
    ...history.map((h) => Math.max(Math.abs(h.kinetic), Math.abs(h.potential), Math.abs(h.total))),
    1,
  );

  const formatEnergy = (value: number): string => {
    if (Math.abs(value) < 0.001) return value.toExponential(2);
    if (Math.abs(value) >= 1000) return value.toExponential(2);
    return value.toFixed(3);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-cyan-400 font-semibold text-sm">系统能量</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[10px] text-slate-400">动能</span>
              </div>
              <div className="text-sm font-mono text-green-400">
                {formatEnergy(simulationState.kineticEnergy)}
              </div>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-[10px] text-slate-400">势能</span>
              </div>
              <div className="text-sm font-mono text-purple-400">
                {formatEnergy(simulationState.potentialEnergy)}
              </div>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-slate-400">总能量</span>
              </div>
              <div className="text-sm font-mono text-cyan-400">
                {formatEnergy(simulationState.totalEnergy)}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ThermometerSun className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-400">温度</span>
              </div>
              <span className="text-sm font-mono text-orange-400">
                {simulationState.temperature.toFixed(1)} K
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500 transition-all duration-300"
                style={{
                  width: `${Math.min(simulationState.temperature / 10, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>0K</span>
              <span>500K</span>
              <span>1000K+</span>
            </div>
          </div>

          {history.length > 1 && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">能量趋势</span>
              </div>
              <div className="relative h-20 bg-slate-900/50 rounded-lg overflow-hidden">
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="1.5"
                    points={history
                      .map(
                        (h, i) =>
                          `${(i / (history.length - 1)) * 100},${80 - (Math.abs(h.kinetic) / maxEnergy) * 70}`,
                      )
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    points={history
                      .map(
                        (h, i) =>
                          `${(i / (history.length - 1)) * 100},${80 - (Math.abs(h.potential) / maxEnergy) * 70}`,
                      )
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    points={history
                      .map(
                        (h, i) =>
                          `${(i / (history.length - 1)) * 100},${80 - (Math.abs(h.total) / maxEnergy) * 70}`,
                      )
                      .join(' ')}
                  />
                </svg>
                <div className="absolute bottom-1 right-1 flex flex-col gap-1 text-[8px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-green-400" />
                    <span className="text-green-400">动能</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-purple-400" />
                    <span className="text-purple-400">势能</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5 bg-cyan-400 border-dashed" />
                    <span className="text-cyan-400">总能</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500">
            能量单位: kJ/mol (相对值)
          </div>
        </div>
      )}
    </div>
  );
};
