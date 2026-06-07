/// <reference lib="webworker" />

import type {
  Atom,
  Bond,
  SimulationParams,
  Vector3,
  ForceResult,
} from '../types';
import type {
  WorkerMessage,
  WorkerResponse,
  WorkerStepResult,
} from '../types/worker';

const vecAdd = (a: Vector3, b: Vector3): Vector3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];

const vecScale = (v: Vector3, s: number): Vector3 => [
  v[0] * s,
  v[1] * s,
  v[2] * s,
];

const vecSub = (a: Vector3, b: Vector3): Vector3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

const vecDot = (a: Vector3, b: Vector3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const vecLength = (v: Vector3): number =>
  Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

const vecNormalize = (v: Vector3): Vector3 => {
  const len = vecLength(v);
  if (len === 0) return [0, 0, 0];
  return vecScale(v, 1 / len);
};

const MAX_VELOCITY = 100;
const MAX_FORCE = 1000;

const clampVector = (v: Vector3, max: number): Vector3 => {
  const lenSq = vecDot(v, v);
  if (lenSq > max * max) {
    const len = Math.sqrt(lenSq);
    return vecScale(v, max / len);
  }
  return v;
};

class SpatialHash {
  private cellSize: number;
  private grid: Map<string, number[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getCellKey(pos: Vector3): string {
    return `${Math.floor(pos[0] / this.cellSize)},${Math.floor(pos[1] / this.cellSize)},${Math.floor(pos[2] / this.cellSize)}`;
  }

  public clear(): void {
    this.grid.clear();
  }

  public build(positions: Vector3[]): void {
    this.clear();
    for (let i = 0; i < positions.length; i++) {
      const key = this.getCellKey(positions[i]);
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(i);
    }
  }

  public getNearbyPairs(): [number, number][] {
    const pairs: [number, number][] = [];
    const visited = new Set<string>();

    this.grid.forEach((indices, key) => {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const a = indices[i];
          const b = indices[j];
          const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!visited.has(pairKey)) {
            visited.add(pairKey);
            pairs.push([a, b]);
          }
        }
      }

      const [cx, cy, cz] = key.split(',').map(Number);

      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            if (dx === 0 && dy < 0) continue;
            if (dx === 0 && dy === 0 && dz < 0) continue;

            const neighborKey = `${cx + dx},${cy + dy},${cz + dz}`;
            const neighborCell = this.grid.get(neighborKey);
            if (!neighborCell) continue;

            for (const a of indices) {
              for (const b of neighborCell) {
                const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`;
                if (!visited.has(pairKey)) {
                  visited.add(pairKey);
                  pairs.push([a, b]);
                }
              }
            }
          }
        }
      }
    });

    return pairs;
  }
}

const calculateSpringForce = (
  atom1: Atom,
  atom2: Atom,
  bond: Bond,
): { force1: Vector3; force2: Vector3; potential: number } => {
  const delta = vecSub(atom2.position, atom1.position);
  const distance = vecLength(delta);

  if (distance === 0) {
    return { force1: [0, 0, 0], force2: [0, 0, 0], potential: 0 };
  }

  const displacement = distance - bond.equilibriumLength;
  const forceMagnitude = -bond.springConstant * displacement;
  const direction = vecNormalize(delta);

  const force1 = vecScale(direction, forceMagnitude);
  const force2 = vecScale(direction, -forceMagnitude);
  const potential = 0.5 * bond.springConstant * displacement * displacement;

  return { force1, force2, potential };
};

const calculateLJForce = (
  atom1: Atom,
  atom2: Atom,
  params: SimulationParams,
): { force1: Vector3; force2: Vector3; potential: number } => {
  const delta = vecSub(atom2.position, atom1.position);
  const distance = vecLength(delta);

  if (distance === 0 || distance > params.cutoffRadius) {
    return { force1: [0, 0, 0], force2: [0, 0, 0], potential: 0 };
  }

  const sigmaOverR = params.ljSigma / distance;
  const sigmaOverR6 = Math.pow(sigmaOverR, 6);
  const sigmaOverR12 = sigmaOverR6 * sigmaOverR6;

  const forceMagnitude =
    (24 * params.ljEpsilon * (2 * sigmaOverR12 - sigmaOverR6)) / distance;

  const direction = vecNormalize(delta);
  const force1 = vecScale(direction, forceMagnitude);
  const force2 = vecScale(direction, -forceMagnitude);
  const potential = 4 * params.ljEpsilon * (sigmaOverR12 - sigmaOverR6);

  return { force1, force2, potential };
};

const calculateDampingForce = (atom: Atom, damping: number): Vector3 => {
  return vecScale(atom.velocity, -damping);
};

const calculateAllForces = (
  atoms: Atom[],
  bonds: Bond[],
  params: SimulationParams,
): { forces: Vector3[]; potentialEnergy: number; ljPairCount: number } => {
  const n = atoms.length;
  const forces: Vector3[] = new Array(n).fill(0).map(() => [0, 0, 0]);
  let potentialEnergy = 0;
  let ljPairCount = 0;

  const atomIndexMap = new Map<string, number>();
  const bondSet = new Set<string>();

  atoms.forEach((atom, index) => {
    atomIndexMap.set(atom.id, index);
  });

  for (const bond of bonds) {
    const i = atomIndexMap.get(bond.atomId1);
    const j = atomIndexMap.get(bond.atomId2);
    if (i === undefined || j === undefined) continue;

    const key1 = `${bond.atomId1}-${bond.atomId2}`;
    const key2 = `${bond.atomId2}-${bond.atomId1}`;
    bondSet.add(key1);
    bondSet.add(key2);

    const { force1, force2, potential } = calculateSpringForce(
      atoms[i],
      atoms[j],
      bond,
    );

    forces[i] = vecAdd(forces[i], force1);
    forces[j] = vecAdd(forces[j], force2);
    potentialEnergy += potential;
  }

  if (n > 50) {
    const positions = atoms.map((a) => a.position);
    const spatialHash = new SpatialHash(params.cutoffRadius);
    spatialHash.build(positions);

    const pairs = spatialHash.getNearbyPairs();

    for (const [i, j] of pairs) {
      const hasBond = bondSet.has(`${atoms[i].id}-${atoms[j].id}`);
      if (hasBond) continue;

      const { force1, force2, potential } = calculateLJForce(
        atoms[i],
        atoms[j],
        params,
      );

      if (potential !== 0 || force1[0] !== 0 || force1[1] !== 0 || force1[2] !== 0) {
        forces[i] = vecAdd(forces[i], force1);
        forces[j] = vecAdd(forces[j], force2);
        potentialEnergy += potential;
        ljPairCount++;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const hasBond = bondSet.has(`${atoms[i].id}-${atoms[j].id}`);
        if (hasBond) continue;

        const { force1, force2, potential } = calculateLJForce(
          atoms[i],
          atoms[j],
          params,
        );

        forces[i] = vecAdd(forces[i], force1);
        forces[j] = vecAdd(forces[j], force2);
        potentialEnergy += potential;
        ljPairCount++;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const dampingForce = calculateDampingForce(atoms[i], params.damping);
    forces[i] = vecAdd(forces[i], dampingForce);
  }

  return { forces, potentialEnergy, ljPairCount };
};

const velocityVerlet_PositionStep = (
  atoms: Atom[],
  forces: Vector3[],
  dt: number,
): { newPositions: Vector3[]; halfStepVelocities: Vector3[] } => {
  const n = atoms.length;
  const newPositions: Vector3[] = new Array(n);
  const halfStepVelocities: Vector3[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const atom = atoms[i];
    const force = clampVector(forces[i], MAX_FORCE);
    const acc = vecScale(force, 1 / atom.mass);

    halfStepVelocities[i] = [
      atom.velocity[0] + 0.5 * acc[0] * dt,
      atom.velocity[1] + 0.5 * acc[1] * dt,
      atom.velocity[2] + 0.5 * acc[2] * dt,
    ];

    newPositions[i] = [
      atom.position[0] + halfStepVelocities[i][0] * dt,
      atom.position[1] + halfStepVelocities[i][1] * dt,
      atom.position[2] + halfStepVelocities[i][2] * dt,
    ];
  }

  return { newPositions, halfStepVelocities };
};

const velocityVerlet_VelocityStep = (
  atoms: Atom[],
  halfStepVelocities: Vector3[],
  newForces: Vector3[],
  dt: number,
): { newAtoms: Atom[] } => {
  const n = atoms.length;
  const newAtoms: Atom[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const atom = atoms[i];
    const clampedForce = clampVector(newForces[i], MAX_FORCE);
    const acc = vecScale(clampedForce, 1 / atom.mass);

    let newVelocity: Vector3 = [
      halfStepVelocities[i][0] + 0.5 * acc[0] * dt,
      halfStepVelocities[i][1] + 0.5 * acc[1] * dt,
      halfStepVelocities[i][2] + 0.5 * acc[2] * dt,
    ];

    newVelocity = clampVector(newVelocity, MAX_VELOCITY);

    newAtoms[i] = {
      ...atom,
      position: [
        atom.position[0],
        atom.position[1],
        atom.position[2],
      ],
      velocity: newVelocity,
      force: clampedForce,
    };
  }

  return { newAtoms };
};

const applyDamping = (atoms: Atom[], dampingFactor: number): Atom[] => {
  return atoms.map((atom) => ({
    ...atom,
    velocity: [
      atom.velocity[0] * dampingFactor,
      atom.velocity[1] * dampingFactor,
      atom.velocity[2] * dampingFactor,
    ],
  }));
};

const applyBoundaryConditions = (
  atoms: Atom[],
  bounds: { min: number; max: number },
): Atom[] => {
  return atoms.map((atom) => {
    const newPosition: Vector3 = [...atom.position];
    let newVelocity: Vector3 = [...atom.velocity];

    for (let dim = 0; dim < 3; dim++) {
      if (newPosition[dim] < bounds.min) {
        newPosition[dim] = bounds.min;
        newVelocity[dim] = Math.abs(newVelocity[dim]) * 0.5;
      } else if (newPosition[dim] > bounds.max) {
        newPosition[dim] = bounds.max;
        newVelocity[dim] = -Math.abs(newVelocity[dim]) * 0.5;
      }
    }

    return {
      ...atom,
      position: newPosition,
      velocity: newVelocity,
    };
  });
};

const calculateKineticEnergy = (atoms: Atom[]): number => {
  let ke = 0;
  for (const atom of atoms) {
    const vSquared =
      atom.velocity[0] * atom.velocity[0] +
      atom.velocity[1] * atom.velocity[1] +
      atom.velocity[2] * atom.velocity[2];
    ke += 0.5 * atom.mass * vSquared;
  }
  return ke;
};

const calculateTemperature = (
  kineticEnergy: number,
  numAtoms: number,
): number => {
  const kB = 1.380649e-23;
  const degreesOfFreedom = 3 * Math.max(numAtoms - 1, 1);
  if (degreesOfFreedom === 0) return 0;
  return (2 * kineticEnergy) / (degreesOfFreedom * kB);
};

const checkAndClampEnergies = (atoms: Atom[]): Atom[] => {
  const totalKE = calculateKineticEnergy(atoms);
  const energyThreshold = 1e6;

  if (totalKE > energyThreshold) {
    const scaleFactor = Math.sqrt(energyThreshold / totalKE);
    return atoms.map((atom) => ({
      ...atom,
      velocity: [
        atom.velocity[0] * scaleFactor,
        atom.velocity[1] * scaleFactor,
        atom.velocity[2] * scaleFactor,
      ],
    }));
  }

  return atoms;
};

let state: {
  atoms: Atom[];
  bonds: Bond[];
  params: SimulationParams;
  halfStepVelocities: Vector3[];
  previousForces: Vector3[];
  isInitialized: boolean;
  isPaused: boolean;
} = {
  atoms: [],
  bonds: [],
  params: {
    timeStep: 0.0005,
    ljEpsilon: 0.15,
    ljSigma: 0.35,
    cutoffRadius: 2.5,
    damping: 0.005,
    velocityDamping: 0.995,
  },
  halfStepVelocities: [],
  previousForces: [],
  isInitialized: false,
  isPaused: false,
};

const performSimulationStep = (dt: number): WorkerStepResult => {
  const { atoms, bonds, params } = state;

  const { forces: forces_t, potentialEnergy, ljPairCount } = calculateAllForces(
    atoms,
    bonds,
    params,
  );

  const { newPositions, halfStepVelocities } = velocityVerlet_PositionStep(
    atoms,
    forces_t,
    dt,
  );

  const atomsWithNewPositions: Atom[] = atoms.map((atom, i) => ({
    ...atom,
    position: newPositions[i],
  }));

  const forces_t_dt = calculateAllForces(
    atomsWithNewPositions,
    bonds,
    params,
  );

  const { newAtoms } = velocityVerlet_VelocityStep(
    atomsWithNewPositions,
    halfStepVelocities,
    forces_t_dt.forces,
    dt,
  );

  let dampedAtoms = applyDamping(newAtoms, params.velocityDamping);
  dampedAtoms = applyBoundaryConditions(dampedAtoms, { min: -10, max: 10 });
  dampedAtoms = checkAndClampEnergies(dampedAtoms);

  const kineticEnergy = calculateKineticEnergy(dampedAtoms);
  const totalEnergy = kineticEnergy + potentialEnergy;
  const temperature = calculateTemperature(kineticEnergy, dampedAtoms.length);

  state.atoms = dampedAtoms;
  state.previousForces = forces_t;
  state.halfStepVelocities = halfStepVelocities;

  const n = dampedAtoms.length;
  const positions = new Float32Array(n * 3);
  const velocities = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    const atom = dampedAtoms[i];
    positions[i * 3] = atom.position[0];
    positions[i * 3 + 1] = atom.position[1];
    positions[i * 3 + 2] = atom.position[2];
    velocities[i * 3] = atom.velocity[0];
    velocities[i * 3 + 1] = atom.velocity[1];
    velocities[i * 3 + 2] = atom.velocity[2];
  }

  return {
    positions,
    velocities,
    forces: forces_t_dt.forces,
    previousForces: forces_t,
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
    temperature,
    dt,
    ljPairCount: ljPairCount + forces_t_dt.ljPairCount,
  };
};

const sendResponse = (response: WorkerResponse) => {
  const transfers: Transferable[] = [];
  if (response.type === 'STEP_COMPLETE' && response.payload) {
    const payload = response.payload as WorkerStepResult;
    if (payload.positions) transfers.push(payload.positions.buffer);
    if (payload.velocities) transfers.push(payload.velocities.buffer);
  }
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response, transfers);
};

(self as unknown as DedicatedWorkerGlobalScope).onmessage = (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, payload } = event.data;

    switch (type) {
      case 'INIT':
        if (payload?.atoms && payload?.bonds && payload?.params) {
          state.atoms = payload.atoms;
          state.bonds = payload.bonds;
          state.params = payload.params as SimulationParams;
          state.halfStepVelocities = payload.atoms.map(() => [0, 0, 0]);
          state.previousForces = payload.atoms.map(() => [0, 0, 0]);
          state.isInitialized = true;
          state.isPaused = false;
        }
        sendResponse({ type: 'INIT_COMPLETE' });
        break;

      case 'UPDATE_ATOMS':
        if (payload?.atoms) {
          state.atoms = payload.atoms;
          const n = payload.atoms.length;
          if (state.halfStepVelocities.length !== n) {
            state.halfStepVelocities = new Array(n).fill(0).map(() => [0, 0, 0]);
          }
          if (state.previousForces.length !== n) {
            state.previousForces = new Array(n).fill(0).map(() => [0, 0, 0]);
          }
        }
        break;

      case 'UPDATE_BONDS':
        if (payload?.bonds) {
          state.bonds = payload.bonds;
        }
        break;

      case 'UPDATE_PARAMS':
        if (payload?.params) {
          state.params = { ...state.params, ...payload.params } as SimulationParams;
        }
        break;

      case 'STEP':
        if (!state.isInitialized) {
          sendResponse({ type: 'ERROR', payload: { error: 'Worker not initialized' } });
          return;
        }
        const dt = payload?.dt || state.params.timeStep;
        const result = performSimulationStep(dt);
        sendResponse({ type: 'STEP_COMPLETE', payload: result });
        break;

      case 'RESET':
        if (payload?.atoms && payload?.bonds) {
          state.atoms = payload.atoms;
          state.bonds = payload.bonds;
          state.halfStepVelocities = payload.atoms.map(() => [0, 0, 0]);
          state.previousForces = payload.atoms.map(() => [0, 0, 0]);
        }
        break;

      case 'TERMINATE':
        (self as unknown as DedicatedWorkerGlobalScope).close();
        break;
    }
  } catch (error) {
    sendResponse({
      type: 'ERROR',
      payload: { error: (error as Error).message },
    });
  }
};
