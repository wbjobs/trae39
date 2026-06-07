export type ElementType = 'H' | 'O' | 'C' | 'N';

export interface Atom {
  id: string;
  element: ElementType;
  position: [number, number, number];
  velocity: [number, number, number];
  force: [number, number, number];
  mass: number;
  isSelected?: boolean;
}

export interface Bond {
  id: string;
  atomId1: string;
  atomId2: string;
  equilibriumLength: number;
  springConstant: number;
  type: 'single' | 'double' | 'triple';
}

export interface SimulationState {
  isPaused: boolean;
  timeStep: number;
  simulationSpeed: number;
  currentTime: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  temperature: number;
}

export interface SimulationParams {
  timeStep: number;
  ljEpsilon: number;
  ljSigma: number;
  cutoffRadius: number;
  damping: number;
  velocityDamping: number;
}

export interface MoleculeData {
  version: string;
  createdAt: string;
  atoms: Atom[];
  bonds: Bond[];
  simulationParams: SimulationParams;
}

export interface AtomTypeConfig {
  element: ElementType;
  name: string;
  mass: number;
  radius: number;
  color: string;
  emissive: string;
}

export type Vector3 = [number, number, number];

export interface ForceResult {
  forces: Vector3[];
  potentialEnergy: number;
  ljPairCount: number;
}
