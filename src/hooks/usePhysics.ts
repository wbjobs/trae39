import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { calculateAllForces } from '../utils/physics/forces';
import { velocityVerletStep, applyBoundaryConditions } from '../utils/physics/integrator';
import { calculateAllEnergies } from '../utils/physics/energy';
import type { Vector3 } from '../types';

export const usePhysics = () => {
  const {
    atoms,
    bonds,
    simulationState,
    simulationParams,
    setAtoms,
    setForces,
    setPreviousForces,
    updateEnergies,
    incrementTime,
  } = useSimulationStore();

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const previousForcesRef = useRef<Vector3[]>(atoms.map(() => [0, 0, 0]));

  const simulationStep = useCallback(
    (dt: number) => {
      if (simulationState.isPaused) return;

      const { forces, potentialEnergy } = calculateAllForces(
        atoms,
        bonds,
        simulationParams,
      );

      const effectiveDt = dt * simulationState.simulationSpeed;

      const { newAtoms } = velocityVerletStep(
        atoms,
        forces,
        effectiveDt,
        previousForcesRef.current,
      );

      const boundedAtoms = applyBoundaryConditions(newAtoms, {
        min: -10,
        max: 10,
      });

      const energies = calculateAllEnergies(
        boundedAtoms,
        bonds,
        simulationParams,
      );

      previousForcesRef.current = forces;

      setAtoms(boundedAtoms);
      setForces(forces);
      setPreviousForces(previousForcesRef.current);
      updateEnergies({
        kineticEnergy: energies.kinetic,
        potentialEnergy: energies.potential,
        totalEnergy: energies.total,
        temperature: energies.temperature,
      });
      incrementTime(effectiveDt);
    },
    [
      atoms,
      bonds,
      simulationState.isPaused,
      simulationState.simulationSpeed,
      simulationParams,
      setAtoms,
      setForces,
      setPreviousForces,
      updateEnergies,
      incrementTime,
    ],
  );

  useEffect(() => {
    const fixedDt = simulationParams.timeStep;
    const maxSubSteps = 10;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const frameTime = Math.min(
        (currentTime - lastTimeRef.current) / 1000,
        0.1,
      );
      lastTimeRef.current = currentTime;

      accumulatorRef.current += frameTime;

      let steps = 0;
      while (accumulatorRef.current >= fixedDt && steps < maxSubSteps) {
        simulationStep(fixedDt);
        accumulatorRef.current -= fixedDt;
        steps++;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simulationParams.timeStep, simulationStep]);

  return {
    isRunning: animationFrameRef.current !== null,
  };
};
