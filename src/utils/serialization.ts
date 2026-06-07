import type { MoleculeData, Atom, Bond, SimulationParams } from '../types';

export const serializeMolecule = (
  atoms: Atom[],
  bonds: Bond[],
  simulationParams: SimulationParams,
): string => {
  const data: MoleculeData = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    atoms: atoms.map((atom) => ({
      ...atom,
      force: atom.force || [0, 0, 0],
    })),
    bonds: [...bonds],
    simulationParams: { ...simulationParams },
  };

  return JSON.stringify(data, null, 2);
};

export const deserializeMolecule = (
  jsonString: string,
): {
  atoms: Atom[];
  bonds: Bond[];
  simulationParams: SimulationParams;
} => {
  const data = JSON.parse(jsonString) as MoleculeData;

  if (!data.atoms || !Array.isArray(data.atoms)) {
    throw new Error('Invalid molecule data: missing atoms array');
  }

  const atoms: Atom[] = data.atoms.map((atom) => ({
    ...atom,
    force: atom.force || [0, 0, 0],
    velocity: atom.velocity || [0, 0, 0],
    isSelected: false,
  }));

  const bonds: Bond[] = data.bonds || [];
  const simulationParams: SimulationParams = data.simulationParams || {
    timeStep: 0.0005,
    ljEpsilon: 0.15,
    ljSigma: 0.35,
    cutoffRadius: 2.5,
    damping: 0.001,
  };

  return { atoms, bonds, simulationParams };
};

export const downloadJSON = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readJSONFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
};
