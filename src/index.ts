import { Option, Some, None } from 'tsoption';

interface World {
  width: number;
  height: number;
}

interface Bounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

function inside(x: number, y: number, bounds: Bounds): boolean {
  return (x < bounds.east) && (x >= bounds.west) && (y < bounds.south) && (y >= bounds.north);
}

class QuadTree {
  public static BIN_SIZE = 24;
  public bounds: Bounds;

  public points: Float32Array[] = [];

  public children: QuadTree[];

  constructor(bounds: Bounds) {
    console.assert(bounds.east > bounds.west);
    console.assert(bounds.south > bounds.north);
    this.bounds = bounds;
    this.children = [];
  }

  public * depthFirstIter() {
    for (const tree of this.children) {
      yield* tree.depthFirstIter();

    }
    yield this;
  }

  public add(p: Float32Array) {
    if (this.children.length > 0) {
      let added = false;
      for (const tree of this.depthFirstIter()) {
        if (inside(p[0], p[1], tree.bounds)) {
          tree.add(p);
          added = true;
          break;
        }
      }
      console.assert(added === true);
      return;
    }


    if (this.points.length < QuadTree.BIN_SIZE) {
      this.points.push(p);
    }
    else {
      const subtrees: QuadTree[] = [];

      const subtreeHeight = (this.bounds.south - this.bounds.north) / 2;
      const subtreeWidth = (this.bounds.east - this.bounds.west) / 2;

      // northwest
      subtrees.push(new QuadTree({
        north: this.bounds.north,
        west: this.bounds.west,
        south: this.bounds.north + subtreeHeight,
        east: this.bounds.west + subtreeWidth,
      }));

      // northeast
      subtrees.push(new QuadTree({
        north: this.bounds.north,
        west: this.bounds.west + subtreeWidth,
        south: this.bounds.north + subtreeHeight,
        east: this.bounds.east
      }));

      // southeast
      subtrees.push(new QuadTree({
        north: this.bounds.north + subtreeHeight,
        west: this.bounds.west + subtreeWidth,
        south: this.bounds.south,
        east: this.bounds.east
      }));
      // southwest
      subtrees.push(new QuadTree({
        north: this.bounds.north + subtreeHeight,
        west: this.bounds.west,
        south: this.bounds.south,
        east: this.bounds.west + subtreeWidth
      }))

      for (let i = 0; i < this.points.length; i++) {
        const x = this.points[i][0];
        const y = this.points[i][1];
        for (let tree of subtrees) {
          if (inside(x, y, tree.bounds)) {
            tree.add(this.points[i]);
            break;
          }
        }
      }
      this.children = subtrees;
      this.points = [];
    }

    console.assert(this.points.length <= QuadTree.BIN_SIZE);
  }
}

class Particles {

  private ps: Float32Array;
  public numProps = 4;  // x, y, angle, velocity

  public count: number;

  constructor(count: number) {
    this.count = count;
    this.ps = new Float32Array(count * this.numProps);
  }

  public get(n: number): Float32Array {
    console.assert(n < this.count, "n too big");

    return this.ps.slice(n * this.numProps, (n + 1) * this.numProps);
  }

  public set(n: number, p: Float32Array) {
    console.assert(p.length == this.numProps);
    for (let i = 0; i < p.length; i++) {
      this.ps[n * this.numProps + i] = p[i];
    }
  }

  public static initRandom(count: number, maxX: number, maxY: number, maxAngle: number, maxVelocity: number) {
    const particles = new Particles(count);

    for (let i = 0; i < count; i++) {
      particles.ps[i * particles.numProps + 0] = Math.random() * maxX;
      particles.ps[i * particles.numProps + 1] = Math.random() * maxY;
      particles.ps[i * particles.numProps + 2] = Math.random() * maxAngle;
      particles.ps[i * particles.numProps + 3] = Math.random() * maxVelocity;
    }
    return particles;

  }
}

function render(ps: Particles, world: World, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const qt = new QuadTree({
    north: 0,
    south: world.height,
    west: 0,
    east: world.width
  });

  for (let i = 0; i < ps.count; i++) {
    const p = ps.get(i);
    qt.add(p);
    ctx.fillRect(p[0], p[1], 2, 2);
  }

  ctx.strokeStyle = "red";
  for (const tree of qt.depthFirstIter()) {
    ctx.strokeRect(tree.bounds.north, tree.bounds.west, tree.bounds.south - tree.bounds.north, tree.bounds.east - tree.bounds.west);
  }
}

function tick(ps: Particles, next: Particles, world: World): Particles {
  console.assert(ps.count === next.count);

  const newP = new Float32Array(ps.numProps);
  for (let i = 0; i < ps.count; i++) {
    const oldP = ps.get(i);
    const x = oldP[0];
    const y = oldP[1];
    const angle = oldP[2];
    const vel = oldP[3];
    const dx = Math.sin(angle) * vel;
    const dy = Math.cos(angle) * vel;

    let newX = x + dx;
    let newY = y + dy;
    if (newX < 0)
      newX += world.width;
    if (newX >= world.width)
      newX -= world.width;
    if (newY < 0)
      newY += world.height;
    if (newY >= world.height)
      newY -= world.height;
    newP[0] = newX;
    newP[1] = newY;
    newP[2] = angle;
    newP[3] = vel;
    next.set(i, newP);
  }
  return next;
}

function loop(ps: Particles, nextPs: Particles, world: World, ctx: CanvasRenderingContext2D) {
  const start = performance.now();

  render(ps, world, ctx);
  tick(ps, nextPs, world);

  const time = performance.now() - start;
  ctx.fillText("" + time, 30, 30);
  requestAnimationFrame(() => loop(nextPs, ps, world, ctx));
}

const e = <HTMLCanvasElement>document.getElementById("particleCanvas");
const ctx = e.getContext('2d')!;

const ps = Particles.initRandom(100, e.width, e.height, 2 * Math.PI, 3);
loop(ps, new Particles(ps.count), { width: e.width, height: e.height }, ctx);

