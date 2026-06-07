import { useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import { usePhysics } from '../../hooks/usePhysics';
import { Atom } from './Atom';
import { Bond } from './Bond';
import { AtomLabel } from './AtomLabel';
import { createAtom } from '../../utils/initialStructures';

const CameraController = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={50}
      enablePan
      enableZoom
      enableRotate
    />
  );
};

const Lights = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#6688ff" />
      <pointLight position={[10, -5, 10]} intensity={0.3} color="#ff8866" />
    </>
  );
};

interface SceneContentProps {
  showLabels: boolean;
}

const SceneContent = ({ showLabels }: SceneContentProps) => {
  const { atoms, bonds, selectAtom, addAtom, selectedElementType, simulationState } =
    useSimulationStore();
  const { camera, gl } = useThree();

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionPoint = useRef(new THREE.Vector3());

  usePhysics();

  const handleDoubleClick = useCallback(
    (event: any) => {
      if (!simulationState.isPaused) return;

      mouse.current.x =
        ((event.clientX - gl.domElement.offsetLeft) / gl.domElement.clientWidth) * 2 - 1;
      mouse.current.y =
        -((event.clientY - gl.domElement.offsetTop) / gl.domElement.clientHeight) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      if (
        raycaster.current.ray.intersectPlane(
          plane.current,
          intersectionPoint.current,
        )
      ) {
        const newAtom = createAtom(selectedElementType, [
          intersectionPoint.current.x,
          intersectionPoint.current.y,
          intersectionPoint.current.z,
        ]);
        addAtom(newAtom);
      }
    },
    [addAtom, selectedElementType, simulationState.isPaused],
  );

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('dblclick', handleDoubleClick);
      return () => canvas.removeEventListener('dblclick', handleDoubleClick);
    }
  }, [handleDoubleClick]);

  const handleSceneClick = useCallback(() => {
    selectAtom(null);
  }, [selectAtom]);

  return (
    <group onClick={handleSceneClick}>
      <Lights />

      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a365d"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2d4a6f"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      {atoms.map((atom) => (
        <Atom key={atom.id} atom={atom} onSelect={selectAtom} />
      ))}

      {bonds.map((bond) => (
        <Bond key={bond.id} bond={bond} atoms={atoms} />
      ))}

      {showLabels &&
        atoms.map((atom) => <AtomLabel key={`label-${atom.id}`} atom={atom} />)}

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </group>
  );
};

interface MoleculeSceneProps {
  showLabels: boolean;
}

export const MoleculeScene = ({ showLabels }: MoleculeSceneProps) => {
  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 60, near: 0.1, far: 1000 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a192f');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <fog attach="fog" args={['#0a192f', 20, 50]} />
      <CameraController />
      <SceneContent showLabels={showLabels} />
    </Canvas>
  );
};
