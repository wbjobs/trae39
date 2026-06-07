import type { Atom, Bond, Vector3, SimulationParams } from '../../types';

const vecSub = (a: Vector3, b: Vector3): Vector3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

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

const vecLength = (v: Vector3): number =>
  Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

const vecNormalize = (v: Vector3): Vector3 => {
  const len = vecLength(v);
  if (len === 0) return [0, 0, 0];
  return vecScale(v, 1 / len);
};

export const calculateSpringForce = (
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

export const calculateLJForce = (
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

export const calculateDampingForce = (
  atom: Atom,
  damping: number,
): Vector3 => {
  return vecScale(atom.velocity, -damping);
};

export const calculateAllForces = (
  atoms: Atom[],
  bonds: Bond[],
  params: SimulationParams,
): { forces: Vector3[]; potentialEnergy: number } => {
  const n = atoms.length;
  const forces: Vector3[] = new Array(n).fill(0).map(() => [0, 0, 0]);
  let potentialEnergy = 0;

  const atomIndexMap = new Map<string, number>();
  atoms.forEach((atom, index) => {
    atomIndexMap.set(atom.id, index);
  });

  for (const bond of bonds) {
    const i = atomIndexMap.get(bond.atomId1);
    const j = atomIndexMap.get(bond.atomId2);
    if (i === undefined || j === undefined) continue;

    const { force1, force2, potential } = calculateSpringForce(
      atoms[i],
      atoms[j],
      bond,
    );

    forces[i] = vecAdd(forces[i], force1);
    forces[j] = vecAdd(forces[j], force2);
    potentialEnergy += potential;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const hasBond = bonds.some(
        (b) =>
          (b.atomId1 === atoms[i].id && b.atomId2 === atoms[j].id) ||
          (b.atomId1 === atoms[j].id && b.atomId2 === atoms[i].id),
      );
      if (hasBond) continue;

      const { force1, force2, potential } = calculateLJForce(
        atoms[i],
        atoms[j],
        params,
      );

      forces[i] = vecAdd(forces[i], force1);
      forces[j] = vecAdd(forces[j], force2);
      potentialEnergy += potential;
    }
  }

  for (let i = 0; i < n; i++) {
    const dampingForce = calculateDampingForce(atoms[i], params.damping);
    forces[i] = vecAdd(forces[i], dampingForce);
  }

  return { forces, potentialEnergy };
};
