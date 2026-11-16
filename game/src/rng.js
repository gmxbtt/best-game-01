// EMBERFALL — seeded RNG (mulberry32). One instance drives every random choice in a
// run, so `?seed=N` reproduces the same spawns, drops and upgrade offers every time.
// Screenshot states depend on this; gameplay never touches Math.random().
export class RNG {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  // Next float in [0, 1).
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Float in [min, max).
  range(min, max) {
    return min + this.next() * (max - min);
  }

  // Integer in [min, max] inclusive.
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // One element of an array.
  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }

  // True with probability p.
  chance(p) {
    return this.next() < p;
  }

  // Fisher-Yates shuffle, in place, driven by this RNG.
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }
}
