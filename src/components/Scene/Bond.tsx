import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Bond as BondType, Atom as AtomType } from '../../types';

interface BondProps {
  bond: BondType;
  atoms: AtomType[];
}

export const Bond = ({ bond, atoms }: BondProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);

  const atom1 = useMemo(
    () => atoms.find((a) => a.id === bond.atomId1),
    [atoms, bond.atomId1],
  );

  const atom2 = useMemo(
    () => atoms.find((a) => a.id === bond.atomId2),
    [atoms, bond.atomId2],
  );

  useFrame(() => {
    if (!atom1 || !atom2 || !meshRef.current) return;

    const p1 = new THREE.Vector3(
      atom1.position[0],
      atom1.position[1],
      atom1.position[2],
    );
    const p2 = new THREE.Vector3(
      atom2.position[0],
      atom2.position[1],
      atom2.position[2],
    );

    const direction = new THREE.Vector3().subVectors(p2, p1);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    meshRef.current.position.copy(midpoint);
    meshRef.current.scale.y = length;
    meshRef.current.lookAt(p2);
    meshRef.current.rotateX(Math.PI / 2);

    if (cylinderRef.current) {
      cylinderRef.current.position.copy(midpoint);
      cylinderRef.current.scale.y = length;
      cylinderRef.current.lookAt(p2);
      cylinderRef.current.rotateX(Math.PI / 2);
    }
  });

  if (!atom1 || !atom2) return null;

  const bondRadius = bond.type === 'triple' ? 0.12 : bond.type === 'double' ? 0.1 : 0.08;
  const bondColor = '#8899aa';

  return (
    <group>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[bondRadius, bondRadius, 1, 16]} />
        <meshStandardMaterial
          color={bondColor}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
      {bond.type === 'double' && (
        <mesh ref={cylinderRef} position={[0.2, 0, 0]}>
          <cylinderGeometry args={[bondRadius * 0.8, bondRadius * 0.8, 1, 16]} />
          <meshStandardMaterial
            color={bondColor}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
      )}
    </group>
  );
};
