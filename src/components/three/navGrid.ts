import * as THREE from 'three';

/**
 * Cuadrícula de navegación: los personajes caminan esquivando paredes, puertas cerradas,
 * escritorios, mesas, racks y demás muebles, como una persona real.
 * Los obstáculos se extraen automáticamente de la escena 3D ya construida.
 */
export interface NavBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface NavPoint {
  x: number;
  z: number;
}

export class NavGrid {
  private readonly cell: number;
  private readonly minX: number;
  private readonly minZ: number;
  private readonly w: number;
  private readonly h: number;
  private readonly blocked: Uint8Array;

  constructor(root: THREE.Object3D, bounds: NavBounds, cell = 0.25, radius = 0.3) {
    this.cell = cell;
    this.minX = bounds.minX;
    this.minZ = bounds.minZ;
    this.w = Math.ceil((bounds.maxX - bounds.minX) / cell);
    this.h = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);

    // Borde exterior de la plataforma
    const margin = 0.45;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.minX + (i + 0.5) * cell;
        const z = this.minZ + (j + 0.5) * cell;
        if (x < bounds.minX + margin || x > bounds.maxX - margin || z < bounds.minZ + margin || z > bounds.maxZ - margin) {
          this.blocked[j * this.w + i] = 1;
        }
      }
    }

    // Obstáculos: toda malla con volumen a la altura de una persona (muebles, paredes, racks...)
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      box.setFromObject(m);
      if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) return;
      if (box.max.y < 0.3 || box.min.y > 1.7) return; // piso, alfombras, luces y rótulos altos
      if (box.max.y - box.min.y < 0.12) return;
      this.markBox(box.min.x - radius, box.max.x + radius, box.min.z - radius, box.max.z + radius);
    });
  }

  private markBox(x0: number, x1: number, z0: number, z1: number) {
    const i0 = Math.max(0, Math.floor((x0 - this.minX) / this.cell));
    const i1 = Math.min(this.w - 1, Math.floor((x1 - this.minX) / this.cell));
    const j0 = Math.max(0, Math.floor((z0 - this.minZ) / this.cell));
    const j1 = Math.min(this.h - 1, Math.floor((z1 - this.minZ) / this.cell));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = this.minX + (i + 0.5) * this.cell;
        const cz = this.minZ + (j + 0.5) * this.cell;
        if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) this.blocked[j * this.w + i] = 1;
      }
    }
  }

  private idx(x: number, z: number): [number, number] {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  private free(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.blocked[j * this.w + i] === 0;
  }

  private center(i: number, j: number): NavPoint {
    return { x: this.minX + (i + 0.5) * this.cell, z: this.minZ + (j + 0.5) * this.cell };
  }

  /** Celda libre más cercana (para puntos de inicio o destino dentro de un mueble, como una silla o cama). */
  private nearestFree(p: NavPoint): [number, number] | null {
    const [ci, cj] = this.idx(p.x, p.z);
    if (this.free(ci, cj)) return [ci, cj];
    const maxR = Math.ceil(4 / this.cell);
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let r = 1; r <= maxR; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di;
          const j = cj + dj;
          if (!this.free(i, j)) continue;
          const d = di * di + dj * dj;
          if (d < bestD) {
            bestD = d;
            best = [i, j];
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  private lineFree(a: NavPoint, b: NavPoint): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const [i, j] = this.idx(a.x + dx * t, a.z + dz * t);
      if (!this.free(i, j)) return false;
    }
    return true;
  }

  /**
   * Camino desde `from` hasta `to` sin atravesar obstáculos. Devuelve los puntos intermedios y el
   * destino final. null si no hay ruta (el llamador usa su ruta de respaldo).
   */
  findPath(from: NavPoint, to: NavPoint): NavPoint[] | null {
    const s = this.nearestFree(from);
    const g = this.nearestFree(to);
    if (!s || !g) return null;

    const W = this.w;
    const total = this.w * this.h;
    const gScore = new Float32Array(total).fill(Infinity);
    const parent = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const startId = s[1] * W + s[0];
    const goalId = g[1] * W + g[0];
    gScore[startId] = 0;

    // Montículo binario (f, id)
    const heapF: number[] = [];
    const heapId: number[] = [];
    const push = (f: number, id: number) => {
      let k = heapF.length;
      heapF.push(f);
      heapId.push(id);
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapF[p] <= heapF[k]) break;
        [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
        [heapId[p], heapId[k]] = [heapId[k], heapId[p]];
        k = p;
      }
    };
    const pop = (): number => {
      const top = heapId[0];
      const lf = heapF.pop()!;
      const li = heapId.pop()!;
      if (heapF.length) {
        heapF[0] = lf;
        heapId[0] = li;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heapF.length && heapF[l] < heapF[m]) m = l;
          if (r < heapF.length && heapF[r] < heapF[m]) m = r;
          if (m === k) break;
          [heapF[m], heapF[k]] = [heapF[k], heapF[m]];
          [heapId[m], heapId[k]] = [heapId[k], heapId[m]];
          k = m;
        }
      }
      return top;
    };
    const heur = (i: number, j: number) => {
      const dx = Math.abs(i - g[0]);
      const dz = Math.abs(j - g[1]);
      return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * this.cell;
    };

    push(heur(s[0], s[1]), startId);
    let found = false;
    while (heapF.length) {
      const id = pop();
      if (closed[id]) continue;
      closed[id] = 1;
      if (id === goalId) {
        found = true;
        break;
      }
      const ci = id % W;
      const cj = (id - ci) / W;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (!this.free(ni, nj)) continue;
          // sin cortar esquinas
          if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;
          const nid = nj * W + ni;
          if (closed[nid]) continue;
          const ng = gScore[id] + (di && dj ? Math.SQRT2 : 1) * this.cell;
          if (ng < gScore[nid]) {
            gScore[nid] = ng;
            parent[nid] = id;
            push(ng + heur(ni, nj), nid);
          }
        }
      }
    }
    if (!found) return null;

    const cells: NavPoint[] = [];
    for (let id = goalId; id !== -1; id = parent[id]) {
      const i = id % W;
      cells.push(this.center(i, (id - i) / W));
    }
    cells.reverse();

    // Suavizado por línea de visión: menos giros, sin tocar obstáculos
    const pts: NavPoint[] = [from, ...cells];
    const out: NavPoint[] = [];
    let anchor = 0;
    while (anchor < pts.length - 1) {
      let next = pts.length - 1;
      while (next > anchor + 1 && !this.lineFree(pts[anchor], pts[next])) next--;
      out.push(pts[next]);
      anchor = next;
    }
    out.push(to);
    return out;
  }
}
