import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Atom as AtomType } from '../../types';
import { ATOM_TYPES } from '../../utils/atomTypes';

interface AtomLabelProps {
  atom: AtomType;
}

export const AtomLabel = ({ atom }: AtomLabelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  const config = ATOM_TYPES[atom.element];

  useEffect(() => {
    if (!spriteRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 128;
    canvas.height = 64;

    context.fillStyle = 'rgba(10, 25, 47, 0.9)';
    context.strokeStyle = atom.isSelected ? '#64ffda' : 'rgba(100, 255, 218, 0.5)';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(0, 0, 128, 64, 8);
    context.fill();
    context.stroke();

    context.font = 'bold 36px JetBrains Mono, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = config.color;
    context.fillText(atom.element, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = spriteRef.current.material as THREE.SpriteMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }, [atom.element, atom.isSelected, config.color]);

  useFrame(() => {
    if (!groupRef.current || !spriteRef.current) return;

    groupRef.current.position.set(
      atom.position[0],
      atom.position[1] + config.radius + 0.5,
      atom.position[2],
    );

    spriteRef.current.lookAt(camera.position);
  });

  return (
    <group ref={groupRef}>
      <sprite ref={spriteRef} scale={[1.2, 0.6, 1]}>
        <spriteMaterial transparent depthTest={false} />
      </sprite>
    </group>
  );
};
