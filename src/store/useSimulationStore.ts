import { create } from 'zustand';
import type {
  Atom,
  Bond,
  ElementType,
  SimulationState,
  SimulationParams,
  Vector3,
} from '../types';
import { DEFAULT_SIMULATION_PARAMS } from '../utils/atomTypes';
import { getInitialStructure } from '../utils/initialStructures';

interface SimulationStore {
  atoms: Atom[];
  bonds: Bond[];
  simulationState: SimulationState;
  simulationParams: SimulationParams;
  selectedAtomId: string | null;
  selectedElementType: ElementType;
  forces: Vector3[];
  previousForces: Vector3[];

  setAtoms: (atoms: Atom[]) => void;
  setBonds: (bonds: Bond[]) => void;
  addAtom: (atom: Atom) => void;
  removeAtom: (atomId: string) => void;
  addBond: (bond: Bond) => void;
  removeBond: (bondId: string) => void;
  updateAtomPosition: (atomId: string, position: Vector3) => void;
  selectAtom: (atomId: string | null) => void;
  setSelectedElementType: (element: ElementType) => void;

  setForces: (forces: Vector3[]) => void;
  setPreviousForces: (forces: Vector3[]) => void;

  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  updateEnergies: (data: {
    kineticEnergy: number;
    potentialEnergy: number;
    totalEnergy: number;
    temperature: number;
  }) => void;
  incrementTime: (dt: number) => void;

  updateSimulationParams: (params: Partial<SimulationParams>) => void;

  resetSimulation: () => void;
  loadStructure: (data: {
    atoms: Atom[];
    bonds: Bond[];
    simulationParams?: SimulationParams;
  }) => void;
}

const initialStructure = getInitialStructure();
const initialForces = initialStructure.atoms.map(() => [0, 0, 0] as Vector3);

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  atoms: initialStructure.atoms,
  bonds: initialStructure.bonds,
  simulationState: {
    isPaused: false,
    timeStep: DEFAULT_SIMULATION_PARAMS.timeStep,
    simulationSpeed: 1.0,
    currentTime: 0,
    kineticEnergy: 0,
    potentialEnergy: 0,
    totalEnergy: 0,
    temperature: 300,
  },
  simulationParams: { ...DEFAULT_SIMULATION_PARAMS },
  selectedAtomId: null,
  selectedElementType: 'O',
  forces: initialForces,
  previousForces: initialForces,

  setAtoms: (atoms) => set({ atoms }),
  setBonds: (bonds) => set({ bonds }),

  addAtom: (atom) =>
    set((state) => ({
      atoms: [...state.atoms, atom],
      forces: [...state.forces, [0, 0, 0]],
      previousForces: [...state.previousForces, [0, 0, 0]],
    })),

  removeAtom: (atomId) => {
    const state = get();
    const atomIndex = state.atoms.findIndex((a) => a.id === atomId);
    if (atomIndex === -1) return;

    set((state) => ({
      atoms: state.atoms.filter((a) => a.id !== atomId),
      bonds: state.bonds.filter(
        (b) => b.atomId1 !== atomId && b.atomId2 !== atomId,
      ),
      forces: state.forces.filter((_, i) => i !== atomIndex),
      previousForces: state.previousForces.filter((_, i) => i !== atomIndex),
      selectedAtomId: state.selectedAtomId === atomId ? null : state.selectedAtomId,
    }));
  },

  addBond: (bond) =>
    set((state) => ({
      bonds: [...state.bonds, bond],
    })),

  removeBond: (bondId) =>
    set((state) => ({
      bonds: state.bonds.filter((b) => b.id !== bondId),
    })),

  updateAtomPosition: (atomId, position) =>
    set((state) => ({
      atoms: state.atoms.map((a) =>
        a.id === atomId ? { ...a, position } : a,
      ),
    })),

  selectAtom: (atomId) =>
    set((state) => ({
      selectedAtomId: atomId,
      atoms: state.atoms.map((a) => ({
        ...a,
        isSelected: a.id === atomId,
      })),
    })),

  setSelectedElementType: (element) => set({ selectedElementType: element }),

  setForces: (forces) => set({ forces }),
  setPreviousForces: (forces) => set({ previousForces: forces }),

  togglePause: () =>
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        isPaused: !state.simulationState.isPaused,
      },
    })),

  setPaused: (paused) =>
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        isPaused: paused,
      },
    })),

  setSimulationSpeed: (speed) =>
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        simulationSpeed: speed,
      },
    })),

  updateEnergies: (data) =>
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        kineticEnergy: data.kineticEnergy,
        potentialEnergy: data.potentialEnergy,
        totalEnergy: data.totalEnergy,
        temperature: data.temperature,
      },
    })),

  incrementTime: (dt) =>
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        currentTime: state.simulationState.currentTime + dt,
      },
    })),

  updateSimulationParams: (params) =>
    set((state) => ({
      simulationParams: {
        ...state.simulationParams,
        ...params,
      },
    })),

  resetSimulation: () => {
    const structure = getInitialStructure();
    const forces = structure.atoms.map(() => [0, 0, 0] as Vector3);
    set({
      atoms: structure.atoms.map((a) => ({ ...a, isSelected: false })),
      bonds: structure.bonds,
      forces,
      previousForces: forces,
      selectedAtomId: null,
      simulationState: {
        isPaused: false,
        timeStep: DEFAULT_SIMULATION_PARAMS.timeStep,
        simulationSpeed: 1.0,
        currentTime: 0,
        kineticEnergy: 0,
        potentialEnergy: 0,
        totalEnergy: 0,
        temperature: 300,
      },
      simulationParams: { ...DEFAULT_SIMULATION_PARAMS },
    });
  },

  loadStructure: (data) => {
    const forces = data.atoms.map(() => [0, 0, 0] as Vector3);
    set({
      atoms: data.atoms.map((a) => ({ ...a, isSelected: false })),
      bonds: data.bonds,
      forces,
      previousForces: forces,
      selectedAtomId: null,
      simulationParams: data.simulationParams || get().simulationParams,
      simulationState: {
        ...get().simulationState,
        currentTime: 0,
        kineticEnergy: 0,
        potentialEnergy: 0,
        totalEnergy: 0,
      },
    });
  },
}));
