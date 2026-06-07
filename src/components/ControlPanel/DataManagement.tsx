import { useState, useRef } from 'react';
import { Download, Upload, FileJson, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  serializeMolecule,
  deserializeMolecule,
  downloadJSON,
  readJSONFile,
} from '../../utils/serialization';

export const DataManagement = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { atoms, bonds, simulationParams, loadStructure } = useSimulationStore();

  const handleSave = () => {
    try {
      const json = serializeMolecule(atoms, bonds, simulationParams);
      const filename = `molecule_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(json, filename);
      setSuccess('分子结构已保存');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('保存失败: ' + (e as Error).message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLoad = async (file: File) => {
    try {
      const content = await readJSONFile(file);
      const data = deserializeMolecule(content);
      loadStructure(data);
      setSuccess('分子结构已加载');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('加载失败: ' + (e as Error).message);
      setTimeout(() => setError(null), 3000);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLoad(file);
    }
  };

  const handleClickLoad = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-semibold text-sm">数据管理</span>
        </div>
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
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              保存结构
            </button>
            <button
              onClick={handleClickLoad}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              加载结构
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2 bg-green-900/30 border border-green-700/50 rounded-lg text-xs text-green-400">
              <FileJson className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-2">当前结构统计</div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">原子总数:</span>
                <span className="text-slate-300 font-mono">{atoms.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">化学键:</span>
                <span className="text-slate-300 font-mono">{bonds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">H 原子:</span>
                <span className="text-white font-mono">
                  {atoms.filter((a) => a.element === 'H').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">O 原子:</span>
                <span className="text-red-400 font-mono">
                  {atoms.filter((a) => a.element === 'O').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">C 原子:</span>
                <span className="text-gray-400 font-mono">
                  {atoms.filter((a) => a.element === 'C').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">N 原子:</span>
                <span className="text-blue-400 font-mono">
                  {atoms.filter((a) => a.element === 'N').length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            <p>支持的文件格式: JSON</p>
            <p>包含原子位置、速度、化学键和模拟参数</p>
          </div>
        </div>
      )}
    </div>
  );
};
