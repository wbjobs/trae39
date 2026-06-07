import type { Atom, Bond, Vector3, SimulationParams, ForceResult } from '../../types';
import { SpatialHash } from './spatialHash';

const vecSub = (a: Vector3, b: Vector3): Vector3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

const vecAddInPlace = (a: Vector3, b: Vector3): void => {
  a[0] += b[0];
  a[1] += b[1];
  a[2] += b[2];
};

const vecScale = (v: Vector3, s: number): Vector3 => [
  v[0] * s,
  v[1] * s,
  v[2] * s,
];

const vecLengthSq = (v: Vector3): number =>
  v[0] * v[0] + v[1] * v[1] + v[2] * v[2];

const vecLength = (v: Vector3): number => Math.sqrt(vecLengthSq(v));

const vecNormalize = (v: Vector3): Vector3 => {
  const len = vecLength(v);
  if (len === 0) return [0, 0, 0];
  const invLen = 1 / len;
  return [v[0] * invLen, v[1] * invLen, v[2] * invLen];
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
  const distSq = vecLengthSq(delta);

  if (distSq === 0 || distSq > params.cutoffRadius * params.cutoffRadius) {
    return { force1: [0, 0, 0], force2: [0, 0, 0], potential: 0 };
  }

  const distance = Math.sqrt(distSq);
  const sigmaOverR = params.ljSigma / distance;
  const sigmaOverR6 = sigmaOverR * sigmaOverR * sigmaOverR * sigmaOverR * sigmaOverR * sigmaOverR;
  const sigmaOverR12 = sigmaOverR6 * sigmaOverR6;

  const forceMagnitude =
    (24 * params.ljEpsilon * (2 * sigmaOverR12 - sigmaOverR6)) / distance;

  const invDist = 1 / distance;
  const direction: Vector3 = [delta[0] * invDist, delta[1] * invDist, delta[2] * invDist];

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

const atomIndexMap = new Map<string, number>();
const bondSet = new Set<string>();
let spatialHash: SpatialHash | null = null;
let forcesCache: Vector3[] = [];

export const calculateAllForces = (
  atoms: Atom[],
  bonds: Bond[],
  params: SimulationParams,
  useSpatialHash: boolean = true,
): ForceResult => {
  const n = atoms.length;

  if (forcesCache.length !== n) {
    forcesCache = new Array(n);
    for (let i = 0; i < n; i++) {
      forcesCache[i] = [0, 0, 0];
    }
  } else {
    for (let i = 0; i < n; i++) {
      forcesCache[i][0] = 0;
      forcesCache[i][1] = 0;
      forcesCache[i][2] = 0;
    }
  }

  let potentialEnergy = 0;
  let ljPairCount = 0;

  atomIndexMap.clear();
  for (let i = 0; i < n; i++) {
    atomIndexMap.set(atoms[i].id, i);
  }

  bondSet.clear();
  for (const bond of bonds) {
    const i = atomIndexMap.get(bond.atomId1);
    const j = atomIndexMap.get(bond.atomId2);
    if (i === undefined || j === undefined) continue;

    bondSet.add(`${bond.atomId1}-${bond.atomId2}`);
    bondSet.add(`${bond.atomId2}-${bond.atomId1}`);

    const { force1, force2, potential } = calculateSpringForce(
      atoms[i],
      atoms[j],
      bond,
    );

    vecAddInPlace(forcesCache[i], force1);
    vecAddInPlace(forcesCache[j], force2);
    potentialEnergy += potential;
  }

  if (useSpatialHash && n > 50) {
    if (!spatialHash || spatialHash.getCellSize() !== params.cutoffRadius) {
      spatialHash = new SpatialHash(params.cutoffRadius);
    }
    spatialHash.build(atoms.map((a) => a.position));

    const pairs = spatialHash.getNearbyPairs(params.cutoffRadius);

    for (let p = 0; p < pairs.length; p++) {
      const [i, j] = pairs[p];
      const atom1 = atoms[i];
      const atom2 = atoms[j];

      if (bondSet.has(`${atom1.id}-${atom2.id}`)) continue;

      const { force1, force2, potential } = calculateLJForce(
        atom1,
        atom2,
        params,
      );

      if (potential !== 0 || force1[0] !== 0 || force1[1] !== 0 || force1[2] !== 0) {
        vecAddInPlace(forcesCache[i], force1);
        vecAddInPlace(forcesCache[j], force2);
        potentialEnergy += potential;
        ljPairCount++;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (bondSet.has(`${atoms[i].id}-${atoms[j].id}`)) continue;

        const { force1, force2, potential } = calculateLJForce(
          atoms[i],
          atoms[j],
          params,
        );

        if (potential !== 0 || force1[0] !== 0 || force1[1] !== 0 || force1[2] !== 0) {
          vecAddInPlace(forcesCache[i], force1);
          vecAddInPlace(forcesCache[j], force2);
          potentialEnergy += potential;
          ljPairCount++;
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const dampingForce = calculateDampingForce(atoms[i], params.damping);
    vecAddInPlace(forcesCache[i], dampingForce);
  }

  return { forces: forcesCache, potentialEnergy, ljPairCount };
};
