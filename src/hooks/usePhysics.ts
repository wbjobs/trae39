import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { calculateAllForces } from '../utils/physics/forces';
import {
  velocityVerlet_PositionStep,
  velocityVerlet_VelocityStep,
  applyBoundaryConditions,
  applyDamping,
  checkAndClampEnergies,
} from '../utils/physics/integrator';
import { calculateAllEnergies } from '../utils/physics/energy';
import type { Vector3, Atom } from '../types';

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
  const forcesRef = useRef<Vector3[]>(atoms.map(() => [0, 0, 0]));
  const atomsRef = useRef<Atom[]>(atoms);

  useEffect(() => {
    atomsRef.current = atoms;
  }, [atoms]);

  const simulationStep = useCallback(
    (dt: number) => {
      if (simulationState.isPaused) return;

      const currentAtoms = atomsRef.current;
      const effectiveDt = dt * simulationState.simulationSpeed;

      const { forces: forces_t, potentialEnergy } = calculateAllForces(
        currentAtoms,
        bonds,
        simulationParams,
      );

      forcesRef.current = forces_t;

      const { newPositions, halfStepVelocities } = velocityVerlet_PositionStep(
        currentAtoms,
        forces_t,
        effectiveDt,
      );

      const atomsWithNewPositions: Atom[] = currentAtoms.map((atom, i) => ({
        ...atom,
        position: newPositions[i],
      }));

      const { forces: forces_t_dt } = calculateAllForces(
        atomsWithNewPositions,
        bonds,
        simulationParams,
      );

      const { newAtoms } = velocityVerlet_VelocityStep(
        atomsWithNewPositions,
        halfStepVelocities,
        forces_t_dt,
        effectiveDt,
      );

      let dampedAtoms = applyDamping(newAtoms, simulationParams.velocityDamping);

      dampedAtoms = applyBoundaryConditions(dampedAtoms, {
        min: -10,
        max: 10,
      });

      dampedAtoms = checkAndClampEnergies(dampedAtoms);

      const energies = calculateAllEnergies(
        dampedAtoms,
        bonds,
        simulationParams,
      );

      atomsRef.current = dampedAtoms;

      setAtoms(dampedAtoms);
      setForces(forces_t_dt);
      setPreviousForces(forces_t);
      updateEnergies({
        kineticEnergy: energies.kinetic,
        potentialEnergy: energies.potential,
        totalEnergy: energies.total,
        temperature: energies.temperature,
      });
      incrementTime(effectiveDt);
    },
    [
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
        0.016,
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
