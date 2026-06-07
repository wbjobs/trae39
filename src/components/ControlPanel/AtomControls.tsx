import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import type { ElementType } from '../../types';
import { ATOM_TYPES, getBondLength } from '../../utils/atomTypes';
import { useSimulationStore } from '../../store/useSimulationStore';
import { createAtom, createBond } from '../../utils/initialStructures';

export const AtomControls = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [batchCount, setBatchCount] = useState(100);
  const {
    selectedElementType,
    setSelectedElementType,
    addAtom,
    removeAtom,
    selectedAtomId,
    atoms,
    addBond,
    simulationState,
    setAtoms,
    setBonds,
  } = useSimulationStore();

  const elements: ElementType[] = ['H', 'O', 'C', 'N'];

  const handleAddAtom = () => {
    const randomPos: [number, number, number] = [
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    ];
    const newAtom = createAtom(selectedElementType, randomPos);
    addAtom(newAtom);
  };

  const handleRemoveSelected = () => {
    if (selectedAtomId) {
      removeAtom(selectedAtomId);
    }
  };

  const handleAddBatchAtoms = () => {
    const newAtoms = [];
    const range = 8;

    for (let i = 0; i < batchCount; i++) {
      const randomPos: [number, number, number] = [
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range,
      ];
      const element = elements[Math.floor(Math.random() * elements.length)];
      newAtoms.push(createAtom(element, randomPos));
    }

    setAtoms([...atoms, ...newAtoms]);
  };

  const handleAddWaterBatch = () => {
    const newAtoms = [];
    const newBonds = [];
    const range = 8;
    const waterCount = Math.floor(batchCount / 3);

    for (let i = 0; i < waterCount; i++) {
      const origin: [number, number, number] = [
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range,
        (Math.random() - 0.5) * range,
      ];

      const [ox, oy, oz] = origin;
      const oxygen = createAtom('O', [ox, oy, oz], [0, 0, 0]);

      const bondLength = getBondLength('H', 'O');
      const angle = (104.5 * Math.PI) / 180;

      const h1x = ox + bondLength * Math.sin(angle / 2);
      const h1y = oy + bondLength * Math.cos(angle / 2);
      const h1z = oz;

      const h2x = ox - bondLength * Math.sin(angle / 2);
      const h2y = oy + bondLength * Math.cos(angle / 2);
      const h2z = oz;

      const hydrogen1 = createAtom('H', [h1x, h1y, h1z], [0, 0, 0]);
      const hydrogen2 = createAtom('H', [h2x, h2y, h2z], [0, 0, 0]);

      const bond1 = createBond(oxygen.id, hydrogen1.id, bondLength);
      const bond2 = createBond(oxygen.id, hydrogen2.id, bondLength);

      newAtoms.push(oxygen, hydrogen1, hydrogen2);
      newBonds.push(bond1, bond2);
    }

    setAtoms([...atoms, ...newAtoms]);
    setBonds([...useSimulationStore.getState().bonds, ...newBonds]);
  };

  const handleClearAll = () => {
    if (confirm('确定要清除所有原子和化学键吗？')) {
      setAtoms([]);
      setBonds([]);
    }
  };

  const handleBondWithSelected = (targetId: string) => {
    if (!selectedAtomId || selectedAtomId === targetId) return;

    const atom1 = atoms.find((a) => a.id === selectedAtomId);
    const atom2 = atoms.find((a) => a.id === targetId);

    if (!atom1 || !atom2) return;

    const existingBond = atoms.some(
      (a) => a.id === selectedAtomId || a.id === targetId,
    );
    if (!existingBond) {
      const bondLength = getBondLength(atom1.element, atom2.element);
      const newBond = createBond(selectedAtomId, targetId, bondLength);
      addBond(newBond);
    }
  };

  const selectedAtom = atoms.find((a) => a.id === selectedAtomId);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-cyan-400 font-semibold text-sm">原子操作</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-2">选择原子类型</label>
            <div className="grid grid-cols-4 gap-2">
              {elements.map((elem) => {
                const config = ATOM_TYPES[elem];
                const isSelected = selectedElementType === elem;
                return (
                  <button
                    key={elem}
                    onClick={() => setSelectedElementType(elem)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all border-2 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-400/20'
                        : 'border-slate-600/50 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: config.color }}
                    >
                      {elem}
                    </span>
                    <span className="text-[10px] text-slate-400">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAtom}
              disabled={!simulationState.isPaused}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加原子
            </button>
            <button
              onClick={handleRemoveSelected}
              disabled={!selectedAtomId}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除选中
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-slate-400" />
              <label className="text-xs text-slate-400">
                批量数量: {batchCount}
              </label>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleAddBatchAtoms}
                className="flex items-center justify-center px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-medium transition-colors"
              >
                随机原子
              </button>
              <button
                onClick={handleAddWaterBatch}
                className="flex items-center justify-center px-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-[10px] font-medium transition-colors"
              >
                水分子
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center justify-center px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium transition-colors border border-slate-600/50"
              >
                清除全部
              </button>
            </div>
          </div>

          {selectedAtom && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
              <div className="text-xs text-slate-400 mb-2">选中原子信息</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">元素:</span>
                  <span style={{ color: ATOM_TYPES[selectedAtom.element].color }}>
                    {selectedAtom.element}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">质量:</span>
                  <span className="text-slate-300">
                    {selectedAtom.mass.toFixed(3)} u
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">位置:</span>
                  <span className="text-slate-300 font-mono text-[10px]">
                    ({selectedAtom.position.map((v) => v.toFixed(2)).join(', ')})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">速度:</span>
                  <span className="text-slate-300 font-mono text-[10px]">
                    ({selectedAtom.velocity.map((v) => v.toFixed(2)).join(', ')})
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedAtomId && (
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                与以下原子成键:
              </label>
              <div className="flex flex-wrap gap-1">
                {atoms
                  .filter((a) => a.id !== selectedAtomId)
                  .slice(0, 8)
                  .map((atom) => (
                    <button
                      key={atom.id}
                      onClick={() => handleBondWithSelected(atom.id)}
                      className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 rounded border border-slate-600/50 transition-colors"
                      style={{ color: ATOM_TYPES[atom.element].color }}
                    >
                      {atom.element}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 italic">
            提示: 暂停模拟后，双击场景可在点击位置添加原子
          </div>
        </div>
      )}
    </div>
  );
};
