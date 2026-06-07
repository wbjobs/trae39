import { useEffect, useRef, useCallback, useState } from 'react';
import type { Atom, Bond, SimulationParams } from '../types';
import type { WorkerStepResult } from '../types/worker';
import type { WorkerMessage, WorkerResponse } from '../types/worker';

interface UsePhysicsWorkerOptions {
  onStepComplete?: (result: WorkerStepResult) => void;
  onError?: (error: string) => void;
}

export const usePhysicsWorker = ({ onStepComplete, onError }: UsePhysicsWorkerOptions = {}) => {
  const workerRef = useRef<Worker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWorkerEnabled, setIsWorkerEnabled] = useState(true);
  const [stats, setStats] = useState({
    stepsProcessed: 0,
    avgStepTime: 0,
    lastStepTime: 0,
    ljPairCount: 0,
  });

  const stepTimeHistoryRef = useRef<number[]>([]);
  const lastStepStartRef = useRef<number>(0);
  const onStepCompleteRef = useRef(onStepComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStepCompleteRef.current = onStepComplete;
  }, [onStepComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const createWorker = useCallback((): Worker | null => {
    try {
      const worker = new Worker(
        new URL('../workers/physics.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'INIT_COMPLETE':
            setIsInitialized(true);
            break;

          case 'STEP_COMPLETE':
            if (payload && ('positions' in payload || 'atoms' in payload)) {
              const result = payload as WorkerStepResult;
              const stepTime = performance.now() - lastStepStartRef.current;

              stepTimeHistoryRef.current.push(stepTime);
              if (stepTimeHistoryRef.current.length > 60) {
                stepTimeHistoryRef.current.shift();
              }

              const avgStepTime = stepTimeHistoryRef.current.reduce((a, b) => a + b, 0) /
                stepTimeHistoryRef.current.length;

              setStats((prev) => ({
                stepsProcessed: prev.stepsProcessed + 1,
                avgStepTime,
                lastStepTime: stepTime,
                ljPairCount: result.ljPairCount,
              }));

              if (onStepCompleteRef.current) {
                onStepCompleteRef.current(result);
              }
            }
            break;

          case 'ERROR':
            if (payload && 'error' in payload) {
              console.error('Physics Worker Error:', payload.error);
              if (onErrorRef.current) {
                onErrorRef.current(payload.error);
              }
            }
            break;
        }
      };

      worker.onerror = (error) => {
        console.error('Physics Worker Error:', error);
        if (onErrorRef.current) {
          onErrorRef.current(error.message);
        }
      };

      return worker;
    } catch (error) {
      console.error('Failed to create physics worker:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (isWorkerEnabled && !workerRef.current) {
      workerRef.current = createWorker();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'TERMINATE' } as WorkerMessage);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isWorkerEnabled, createWorker]);

  const sendMessage = useCallback((message: WorkerMessage) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);

  const init = useCallback(
    (atoms: Atom[], bonds: Bond[], params: SimulationParams) => {
      sendMessage({
        type: 'INIT',
        payload: { atoms, bonds, params },
      });
    },
    [sendMessage],
  );

  const step = useCallback(
    (dt: number) => {
      lastStepStartRef.current = performance.now();
      sendMessage({
        type: 'STEP',
        payload: { dt },
      });
    },
    [sendMessage],
  );

  const updateAtoms = useCallback(
    (atoms: Atom[]) => {
      sendMessage({
        type: 'UPDATE_ATOMS',
        payload: { atoms },
      });
    },
    [sendMessage],
  );

  const updateBonds = useCallback(
    (bonds: Bond[]) => {
      sendMessage({
        type: 'UPDATE_BONDS',
        payload: { bonds },
      });
    },
    [sendMessage],
  );

  const updateParams = useCallback(
    (params: Partial<SimulationParams>) => {
      sendMessage({
        type: 'UPDATE_PARAMS',
        payload: { params },
      });
    },
    [sendMessage],
  );

  const reset = useCallback(
    (atoms: Atom[], bonds: Bond[]) => {
      sendMessage({
        type: 'RESET',
        payload: { atoms, bonds },
      });
      setIsInitialized(false);
    },
    [sendMessage],
  );

  const toggleWorker = useCallback(() => {
    setIsWorkerEnabled((prev) => !prev);
  }, []);

  return {
    isInitialized,
    isWorkerEnabled,
    stats,
    init,
    step,
    updateAtoms,
    updateBonds,
    updateParams,
    reset,
    toggleWorker,
  };
};
