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

export const velocityVerletStep = (
  atoms: Atom[],
  forces: Vector3[],
  dt: number,
  previousForces?: Vector3[],
): {
  newAtoms: Atom[];
  newForces: Vector3[];
  acceleration: Vector3[];
} => {
  const n = atoms.length;
  const newAtoms: Atom[] = new Array(n);
  const newForces: Vector3[] = new Array(n);
  const acceleration: Vector3[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const atom = atoms[i];
    const force = forces[i];
    const prevForce = previousForces ? previousForces[i] : force;

    const acc = vecScale(force, 1 / atom.mass);
    const prevAcc = vecScale(prevForce, 1 / atom.mass);

    const newPosition: Vector3 = [
      atom.position[0] +
        atom.velocity[0] * dt +
        0.5 * prevAcc[0] * dt * dt,
      atom.position[1] +
        atom.velocity[1] * dt +
        0.5 * prevAcc[1] * dt * dt,
      atom.position[2] +
        atom.velocity[2] * dt +
        0.5 * prevAcc[2] * dt * dt,
    ];

    newForces[i] = [0, 0, 0];

    const newVelocity: Vector3 = [
      atom.velocity[0] + 0.5 * (prevAcc[0] + acc[0]) * dt,
      atom.velocity[1] + 0.5 * (prevAcc[1] + acc[1]) * dt,
      atom.velocity[2] + 0.5 * (prevAcc[2] + acc[2]) * dt,
    ];

    acceleration[i] = acc;

    newAtoms[i] = {
      ...atom,
      position: newPosition,
      velocity: newVelocity,
      force: force,
    };
  }

  return { newAtoms, newForces, acceleration };
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
        newVelocity[dim] = Math.abs(newVelocity[dim]) * 0.8;
      } else if (newPosition[dim] > bounds.max) {
        newPosition[dim] = bounds.max;
        newVelocity[dim] = -Math.abs(newVelocity[dim]) * 0.8;
      }
    }

    return {
      ...atom,
      position: newPosition,
      velocity: newVelocity,
    };
  });
};
