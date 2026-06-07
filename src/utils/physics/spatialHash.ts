import type { Vector3 } from '../../types';

export interface SpatialHashCell {
  indices: number[];
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, SpatialHashCell>;
  private bounds: { min: number; max: number };

  constructor(cellSize: number, bounds: { min: number; max: number } = { min: -10, max: 10 }) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.bounds = bounds;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  private getCellKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  private getCellKeyFromPosition(pos: Vector3): string {
    return this.getCellKey(pos[0], pos[1], pos[2]);
  }

  public clear(): void {
    this.grid.clear();
  }

  public insert(index: number, position: Vector3): void {
    const key = this.getCellKeyFromPosition(position);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = { indices: [] };
      this.grid.set(key, cell);
    }
    cell.indices.push(index);
  }

  public build(positions: Vector3[]): void {
    this.clear();
    for (let i = 0; i < positions.length; i++) {
      this.insert(i, positions[i]);
    }
  }

  public getNeighborIndices(position: Vector3, radius: number = 1): number[] {
    const neighbors: number[] = [];
    const cellX = Math.floor(position[0] / this.cellSize);
    const cellY = Math.floor(position[1] / this.cellSize);
    const cellZ = Math.floor(position[2] / this.cellSize);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const key = `${cellX + dx},${cellY + dy},${cellZ + dz}`;
          const cell = this.grid.get(key);
          if (cell) {
            neighbors.push(...cell.indices);
          }
        }
      }
    }

    return neighbors;
  }

  private encodePairKey(a: number, b: number): number {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return min * 100000 + max;
  }

  public getNearbyPairs(cutoffRadius: number): [number, number][] {
    const pairs: [number, number][] = [];
    const visited = new Set<number>();
    const cutoffSq = cutoffRadius * cutoffRadius;

    const gridEntries = Array.from(this.grid.entries());
    const offset = 1000000;

    for (let entryIdx = 0; entryIdx < gridEntries.length; entryIdx++) {
      const [key, cell] = gridEntries[entryIdx];
      const indices = cell.indices;
      const indicesLen = indices.length;

      for (let i = 0; i < indicesLen; i++) {
        for (let j = i + 1; j < indicesLen; j++) {
          const a = indices[i];
          const b = indices[j];
          const pairKey = a * offset + b;
          if (!visited.has(pairKey)) {
            visited.add(pairKey);
            pairs.push([a, b]);
          }
        }
      }

      const comma1 = key.indexOf(',');
      const comma2 = key.indexOf(',', comma1 + 1);
      const cx = parseInt(key.substring(0, comma1), 10);
      const cy = parseInt(key.substring(comma1 + 1, comma2), 10);
      const cz = parseInt(key.substring(comma2 + 1), 10);

      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            if (dx === 0 && dy < 0) continue;
            if (dx === 0 && dy === 0 && dz < 0) continue;

            const neighborKey = `${cx + dx},${cy + dy},${cz + dz}`;
            const neighborCell = this.grid.get(neighborKey);
            if (!neighborCell) continue;

            const neighborIndices = neighborCell.indices;
            const neighborLen = neighborIndices.length;

            for (let i = 0; i < indicesLen; i++) {
              const a = indices[i];
              for (let j = 0; j < neighborLen; j++) {
                const b = neighborIndices[j];
                const pairKey = Math.min(a, b) * offset + Math.max(a, b);
                if (!visited.has(pairKey)) {
                  visited.add(pairKey);
                  pairs.push([a, b]);
                }
              }
            }
          }
        }
      }
    }

    return pairs;
  }

  public getCellCount(): number {
    return this.grid.size;
  }

  public getSize(): number {
    let count = 0;
    this.grid.forEach((cell) => {
      count += cell.indices.length;
    });
    return count;
  }
}
