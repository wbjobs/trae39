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
import { usePhysicsWorker } from './usePhysicsWorker';
import type { Vector3, Atom } from '../types';
import type { WorkerStepResult } from '../types/worker';

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
    resetSimulation,
  } = useSimulationStore();

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const atomsRef = useRef<Atom[]>(atoms);
  const useWorkerRef = useRef<boolean>(true);
  const pendingStepRef = useRef<boolean>(false);

  useEffect(() => {
    atomsRef.current = atoms;
  }, [atoms]);

  const handleWorkerStepComplete = useCallback(
    (result: WorkerStepResult) => {
      if (useWorkerRef.current) {
        const currentAtoms = atomsRef.current;
        const n = currentAtoms.length;

        const { positions, velocities } = result;
        if (positions && velocities && positions.length === n * 3 && velocities.length === n * 3) {
          const updatedAtoms = currentAtoms.map((atom, i) => ({
            ...atom,
            position: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]] as [number, number, number],
            velocity: [velocities[i * 3], velocities[i * 3 + 1], velocities[i * 3 + 2]] as [number, number, number],
          }));
          atomsRef.current = updatedAtoms;
          setAtoms(updatedAtoms);
        } else {
          setAtoms(result.atoms as unknown as typeof currentAtoms);
        }

        setForces(result.forces);
        setPreviousForces(result.previousForces);
        updateEnergies({
          kineticEnergy: result.kineticEnergy,
          potentialEnergy: result.potentialEnergy,
          totalEnergy: result.totalEnergy,
          temperature: result.temperature,
        });
        incrementTime(result.dt);
        pendingStepRef.current = false;
      }
    },
    [setAtoms, setForces, setPreviousForces, updateEnergies, incrementTime],
  );

  const handleWorkerError = useCallback((error: string) => {
    console.warn('Worker error, falling back to main thread:', error);
    useWorkerRef.current = false;
  }, []);

  const {
    isInitialized: workerInitialized,
    isWorkerEnabled,
    stats: workerStats,
    init: initWorker,
    step: stepWorker,
    updateAtoms: updateWorkerAtoms,
    updateBonds: updateWorkerBonds,
    updateParams: updateWorkerParams,
    reset: resetWorker,
    toggleWorker,
  } = usePhysicsWorker({
    onStepComplete: handleWorkerStepComplete,
    onError: handleWorkerError,
  });

  useEffect(() => {
    useWorkerRef.current = isWorkerEnabled;
  }, [isWorkerEnabled]);

  useEffect(() => {
    if (isWorkerEnabled && workerInitialized) {
      updateWorkerAtoms(atoms);
    }
  }, [atoms, isWorkerEnabled, workerInitialized, updateWorkerAtoms]);

  useEffect(() => {
    if (isWorkerEnabled && workerInitialized) {
      updateWorkerBonds(bonds);
    }
  }, [bonds, isWorkerEnabled, workerInitialized, updateWorkerBonds]);

  useEffect(() => {
    if (isWorkerEnabled && workerInitialized) {
      updateWorkerParams(simulationParams);
    }
  }, [simulationParams, isWorkerEnabled, workerInitialized, updateWorkerParams]);

  const simulationStepMainThread = useCallback(
    (dt: number) => {
      if (simulationState.isPaused) return;

      const currentAtoms = atomsRef.current;
      const effectiveDt = dt * simulationState.simulationSpeed;

      const { forces: forces_t, potentialEnergy } = calculateAllForces(
        currentAtoms,
        bonds,
        simulationParams,
      );

      const { newPositions, halfStepVelocities } = velocityVerlet_PositionStep(
        currentAtoms,
        forces_t,
        effectiveDt,
      );

      const atomsWithNewPositions: Atom[] = currentAtoms.map((atom, i) => ({
        ...atom,
        position: newPositions[i],
      }));

      const forces_t_dt = calculateAllForces(
        atomsWithNewPositions,
        bonds,
        simulationParams,
      );

      const { newAtoms } = velocityVerlet_VelocityStep(
        atomsWithNewPositions,
        halfStepVelocities,
        forces_t_dt.forces,
        effectiveDt,
      );

      let dampedAtoms = applyDamping(newAtoms, simulationParams.velocityDamping);
      dampedAtoms = applyBoundaryConditions(dampedAtoms, { min: -10, max: 10 });
      dampedAtoms = checkAndClampEnergies(dampedAtoms);

      const energies = calculateAllEnergies(
        dampedAtoms,
        bonds,
        simulationParams,
      );

      atomsRef.current = dampedAtoms;

      setAtoms(dampedAtoms);
      setForces(forces_t_dt.forces);
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
    if (isWorkerEnabled && !workerInitialized && atoms.length > 0) {
      initWorker(atoms, bonds, simulationParams);
    }
  }, [isWorkerEnabled, workerInitialized, atoms.length, atoms, bonds, simulationParams, initWorker]);

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

      if (simulationState.isPaused) {
        pendingStepRef.current = false;
      }

      let steps = 0;
      while (accumulatorRef.current >= fixedDt && steps < maxSubSteps) {
        console.log('Debug - useWorkerRef:', useWorkerRef.current, 'workerInitialized:', workerInitialized, 'pendingStep:', pendingStepRef.current, 'isPaused:', simulationState.isPaused);
        if (useWorkerRef.current && workerInitialized && !pendingStepRef.current) {
          if (!simulationState.isPaused) {
            console.log('Sending STEP to Worker, dt:', fixedDt * simulationState.simulationSpeed);
            pendingStepRef.current = true;
            stepWorker(fixedDt * simulationState.simulationSpeed);
          }
        } else if (!useWorkerRef.current && !simulationState.isPaused) {
          console.log('Running main thread step');
          simulationStepMainThread(fixedDt);
        }
        accumulatorRef.current -= fixedDt;
        steps++;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    simulationParams.timeStep,
    simulationState.simulationSpeed,
    simulationState.isPaused,
    workerInitialized,
    stepWorker,
    simulationStepMainThread,
  ]);

  const handleReset = useCallback(() => {
    resetSimulation();
    pendingStepRef.current = false;
    if (isWorkerEnabled) {
      const newState = useSimulationStore.getState();
      resetWorker(newState.atoms, newState.bonds);
    }
  }, [resetSimulation, isWorkerEnabled, resetWorker]);

  return {
    isRunning: animationFrameRef.current !== null,
    isWorkerEnabled,
    toggleWorker,
    workerStats,
    workerInitialized,
    reset: handleReset,
  };
};
