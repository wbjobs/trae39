import type { Atom, Vector3 } from '../../types';

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

const vecDot = (a: Vector3, b: Vector3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const MAX_VELOCITY = 100;
const MAX_FORCE = 1000;

export const clampVector = (v: Vector3, max: number): Vector3 => {
  const lenSq = vecDot(v, v);
  if (lenSq > max * max) {
    const len = Math.sqrt(lenSq);
    return vecScale(v, max / len);
  }
  return v;
};

export const velocityVerlet_PositionStep = (
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

export const velocityVerlet_VelocityStep = (
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

export const applyDamping = (atoms: Atom[], dampingFactor: number): Atom[] => {
  return atoms.map((atom) => ({
    ...atom,
    velocity: [
      atom.velocity[0] * dampingFactor,
      atom.velocity[1] * dampingFactor,
      atom.velocity[2] * dampingFactor,
    ],
  }));
};

export const calculateKineticEnergy = (atoms: Atom[]): number => {
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

export const calculateTemperature = (
  kineticEnergy: number,
  numAtoms: number,
): number => {
  const kB = 1.380649e-23;
  const degreesOfFreedom = 3 * numAtoms;
  if (degreesOfFreedom === 0) return 0;
  return (2 * kineticEnergy) / (degreesOfFreedom * kB) * 1e23;
};

export const applyBoundaryConditions = (
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

export const checkAndClampEnergies = (atoms: Atom[]): Atom[] => {
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
