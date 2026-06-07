import type { Atom, Bond, SimulationParams } from '../../types';
import { calculateSpringForce, calculateLJForce } from './forces';

export const calculatePotentialEnergy = (
  atoms: Atom[],
  bonds: Bond[],
  params: SimulationParams,
): number => {
  let potential = 0;

  const atomIndexMap = new Map<string, number>();
  atoms.forEach((atom, index) => {
    atomIndexMap.set(atom.id, index);
  });

  for (const bond of bonds) {
    const i = atomIndexMap.get(bond.atomId1);
    const j = atomIndexMap.get(bond.atomId2);
    if (i === undefined || j === undefined) continue;

    const { potential: bondPotential } = calculateSpringForce(
      atoms[i],
      atoms[j],
      bond,
    );
    potential += bondPotential;
  }

  const n = atoms.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const hasBond = bonds.some(
        (b) =>
          (b.atomId1 === atoms[i].id && b.atomId2 === atoms[j].id) ||
          (b.atomId1 === atoms[j].id && b.atomId2 === atoms[i].id),
      );
      if (hasBond) continue;

      const { potential: ljPotential } = calculateLJForce(
        atoms[i],
        atoms[j],
        params,
      );
      potential += ljPotential;
    }
  }

  return potential;
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
  if (numAtoms === 0) return 0;
  const kB = 1.380649e-23;
  const degreesOfFreedom = 3 * Math.max(numAtoms - 1, 1);
  return (2 * kineticEnergy) / (degreesOfFreedom * kB) * 1e20;
};

export interface EnergyData {
  kinetic: number;
  potential: number;
  total: number;
  temperature: number;
}

export const calculateAllEnergies = (
  atoms: Atom[],
  bonds: Bond[],
  params: SimulationParams,
): EnergyData => {
  const kinetic = calculateKineticEnergy(atoms);
  const potential = calculatePotentialEnergy(atoms, bonds, params);
  const total = kinetic + potential;
  const temperature = calculateTemperature(kinetic, atoms.length);

  return {
    kinetic,
    potential,
    total,
    temperature,
  };
};
