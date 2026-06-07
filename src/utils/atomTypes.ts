import type { ElementType, AtomTypeConfig } from '../types';

export const ATOM_TYPES: Record<ElementType, AtomTypeConfig> = {
  H: {
    element: 'H',
    name: '氢',
    mass: 1.008,
    radius: 0.31,
    color: '#ffffff',
    emissive: '#333333',
  },
  O: {
    element: 'O',
    name: '氧',
    mass: 15.999,
    radius: 0.66,
    color: '#ff4444',
    emissive: '#441111',
  },
  C: {
    element: 'C',
    name: '碳',
    mass: 12.011,
    radius: 0.77,
    color: '#808080',
    emissive: '#1a1a1a',
  },
  N: {
    element: 'N',
    name: '氮',
    mass: 14.007,
    radius: 0.71,
    color: '#4488ff',
    emissive: '#112244',
  },
};

export const BOND_LENGTHS: Record<string, number> = {
  'H-H': 0.74,
  'H-O': 0.96,
  'H-C': 1.09,
  'H-N': 1.01,
  'O-O': 1.48,
  'O-C': 1.43,
  'O-N': 1.44,
  'C-C': 1.54,
  'C-N': 1.47,
  'N-N': 1.45,
};

export const getBondLength = (elem1: ElementType, elem2: ElementType): number => {
  const key1 = `${elem1}-${elem2}`;
  const key2 = `${elem2}-${elem1}`;
  return BOND_LENGTHS[key1] || BOND_LENGTHS[key2] || 1.2;
};

export const DEFAULT_SPRING_CONSTANT = 50;

export const DEFAULT_SIMULATION_PARAMS = {
  timeStep: 0.0005,
  ljEpsilon: 0.15,
  ljSigma: 0.35,
  cutoffRadius: 2.5,
  damping: 0.005,
  velocityDamping: 0.995,
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
