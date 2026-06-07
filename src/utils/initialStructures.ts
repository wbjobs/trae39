import type { Atom, Bond, ElementType } from '../types';
import { ATOM_TYPES, getBondLength, DEFAULT_SPRING_CONSTANT, generateId } from './atomTypes';

export const createAtom = (
  element: ElementType,
  position: [number, number, number],
  velocity: [number, number, number] = [0, 0, 0],
): Atom => {
  const config = ATOM_TYPES[element];
  return {
    id: generateId(),
    element,
    position,
    velocity,
    force: [0, 0, 0],
    mass: config.mass,
    isSelected: false,
  };
};

export const createBond = (
  atomId1: string,
  atomId2: string,
  equilibriumLength: number,
  springConstant: number = DEFAULT_SPRING_CONSTANT,
  type: 'single' | 'double' | 'triple' = 'single',
): Bond => {
  return {
    id: generateId(),
    atomId1,
    atomId2,
    equilibriumLength,
    springConstant,
    type,
  };
};

export const createWaterMolecule = (
  origin: [number, number, number] = [0, 0, 0],
): { atoms: Atom[]; bonds: Bond[] } => {
  const [ox, oy, oz] = origin;

  const oxygen = createAtom('O', [ox, oy, oz], [0, 0, 0]);

  const bondLength = getBondLength('H', 'O');
  const angle = (104.5 * Math.PI) / 180;

  const h1x = ox + bondLength * Math.sin(angle / 2);
  const h1y = oy + bondLength * Math.cos(angle / 2);
  const h1z = oz;

  const h2x = ox - bondLength * Math.sin(angle / 2);
  const h2y = oy + bondLength * Math.cos(angle / 2);
  const h2z = oz;

  const hydrogen1 = createAtom('H', [h1x, h1y, h1z], [0, 0, 0]);
  const hydrogen2 = createAtom('H', [h2x, h2y, h2z], [0, 0, 0]);

  const bond1 = createBond(oxygen.id, hydrogen1.id, bondLength);
  const bond2 = createBond(oxygen.id, hydrogen2.id, bondLength);

  return {
    atoms: [oxygen, hydrogen1, hydrogen2],
    bonds: [bond1, bond2],
  };
};

export const createMethaneMolecule = (
  origin: [number, number, number] = [0, 0, 0],
): { atoms: Atom[]; bonds: Bond[] } => {
  const [cx, cy, cz] = origin;
  const carbon = createAtom('C', [cx, cy, cz], [0, 0, 0]);

  const bondLength = getBondLength('C', 'H');
  const tetrahedralAngle = Math.acos(-1 / 3);

  const hydrogenPositions: [number, number, number][] = [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ].map(([x, y, z]) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    return [
      cx + (x / len) * bondLength,
      cy + (y / len) * bondLength,
      cz + (z / len) * bondLength,
    ] as [number, number, number];
  });

  const hydrogens = hydrogenPositions.map((pos) =>
    createAtom('H', pos, [0, 0, 0]),
  );

  const bonds = hydrogens.map((h) =>
    createBond(carbon.id, h.id, bondLength),
  );

  return {
    atoms: [carbon, ...hydrogens],
    bonds,
  };
};

export const createAmmoniaMolecule = (
  origin: [number, number, number] = [0, 0, 0],
): { atoms: Atom[]; bonds: Bond[] } => {
  const [nx, ny, nz] = origin;
  const nitrogen = createAtom('N', [nx, ny, nz], [0, 0, 0]);

  const bondLength = getBondLength('N', 'H');
  const angle = (107 * Math.PI) / 180;

  const hydrogenPositions: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const rotation = (i * 2 * Math.PI) / 3;
    const hx = nx + bondLength * Math.sin(angle / 2) * Math.cos(rotation);
    const hy = ny + bondLength * Math.cos(angle / 2);
    const hz = nz + bondLength * Math.sin(angle / 2) * Math.sin(rotation);
    hydrogenPositions.push([hx, hy, hz]);
  }

  const hydrogens = hydrogenPositions.map((pos) =>
    createAtom('H', pos, [0, 0, 0]),
  );

  const bonds = hydrogens.map((h) =>
    createBond(nitrogen.id, h.id, bondLength),
  );

  return {
    atoms: [nitrogen, ...hydrogens],
    bonds,
  };
};

export const getInitialStructure = (): { atoms: Atom[]; bonds: Bond[] } => {
  const water1 = createWaterMolecule([-2, 0, 0]);
  const water2 = createWaterMolecule([2, 0, 0]);
  const methane = createMethaneMolecule([0, 2, 0]);

  return {
    atoms: [...water1.atoms, ...water2.atoms, ...methane.atoms],
    bonds: [...water1.bonds, ...water2.bonds, ...methane.bonds],
  };
};
