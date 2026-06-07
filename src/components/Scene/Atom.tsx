import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Atom as AtomType } from '../../types';
import { ATOM_TYPES } from '../../utils/atomTypes';

interface AtomProps {
  atom: AtomType;
  onSelect?: (id: string) => void;
}

export const Atom = ({ atom, onSelect }: AtomProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const config = ATOM_TYPES[atom.element];

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        atom.position[0],
        atom.position[1],
        atom.position[2],
      );
    }
    if (glowRef.current) {
      glowRef.current.position.set(
        atom.position[0],
        atom.position[1],
        atom.position[2],
      );
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissive.set(atom.isSelected ? '#64ffda' : config.emissive);
      material.emissiveIntensity = atom.isSelected ? 0.8 : 0.3;
    }
    if (glowRef.current) {
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = atom.isSelected ? 0.4 : 0.1;
    }
  }, [atom.isSelected, config.emissive]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(atom.id);
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={atom.position}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[config.radius, 32, 32]} />
        <meshStandardMaterial
          color={config.color}
          emissive={atom.isSelected ? '#64ffda' : config.emissive}
          emissiveIntensity={atom.isSelected ? 0.8 : 0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <mesh ref={glowRef} position={atom.position}>
        <sphereGeometry args={[config.radius * 1.3, 32, 32]} />
        <meshBasicMaterial
          color={atom.isSelected ? '#64ffda' : config.color}
          transparent
          opacity={atom.isSelected ? 0.4 : 0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};
