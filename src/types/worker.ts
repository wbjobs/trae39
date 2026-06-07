import type { Atom, Bond, SimulationParams, Vector3 } from './index';

export type WorkerMessageType =
  | 'INIT'
  | 'STEP'
  | 'UPDATE_ATOMS'
  | 'UPDATE_PARAMS'
  | 'UPDATE_BONDS'
  | 'RESET'
  | 'TERMINATE';

export type WorkerResponseType =
  | 'INIT_COMPLETE'
  | 'STEP_COMPLETE'
  | 'ERROR';

export interface WorkerStepResult {
  positions?: Float32Array;
  velocities?: Float32Array;
  atoms?: Atom[];
  forces: Vector3[];
  previousForces: Vector3[];
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  temperature: number;
  dt: number;
  ljPairCount: number;
}

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: {
    atoms?: Atom[];
    bonds?: Bond[];
    params?: SimulationParams | Partial<SimulationParams>;
    dt?: number;
    useSpatialHash?: boolean;
  };
}

export interface WorkerResponse {
  type: WorkerResponseType;
  payload?: WorkerStepResult | { error: string };
}

export interface PhysicsWorkerState {
  atoms: Atom[];
  bonds: Bond[];
  params: SimulationParams;
  halfStepVelocities: Vector3[];
  isInitialized: boolean;
}
