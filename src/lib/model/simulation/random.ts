/** A private, reproducible stream; never use shared mutable global RNG state. */
export interface RandomStream {
  nextUniform(): number;
  nextStandardNormal(): number;
}

/**
 * Create a new random stream seeded by the given string. The seed is hashed to produce a 128-bit value, which is then used to initialize a small fast counter (sfc32) pseudo-random number generator.
 * @param _seed The seed string to initialize the random stream.
 * @returns A RandomStream object with methods to generate uniform and standard normal random numbers.
 */
export function createRandomStream(_seed: string): RandomStream {
  const [a, b, c, d] = cyrb128(_seed);
  const sfc32 = createSfc32(a, b, c, d);

  function nextUniform(): number {
    return sfc32();
  }
  function nextStandardNormal(): number {
    // Box-Muller transform
    // sfc32 includes zero; reject it because ln(0) is not finite.
    let u1 = nextUniform();
    while (u1 === 0) u1 = nextUniform();
    const u2 = nextUniform();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
  return { nextUniform, nextStandardNormal };
}

/**
 * Draw `dimension` independent N(0, 1) values in a fixed, documented
 * order. Validate the dimension; document stream advancement and any antithetic
 * sampling separately. This does not yet scale draws by the time step.
 */
export function standardNormalVector(
  _stream: RandomStream,
  _dimension: number,
): number[] {
  if (!Number.isSafeInteger(_dimension) || _dimension <= 0) {
    throw new Error("Dimension must be a positive integer.");
  }
  const result: number[] = [];
  for (let i = 0; i < _dimension; i++) {
    result.push(_stream.nextStandardNormal());
  }
  return result;
}

/**
 * Hash function to generate a 128-bit hash from a string as a seed for the random number generator.
 * @param str The input string to hash.
 * @returns An array of four 32-bit integers representing the 128-bit hash.
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  ((h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1));
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * Small Fast Counter 32-bit (sfc32) Pseudozufallszahlengenerator.
 * Erwartet vier 32-Bit-Ganzzahlen als Seed.
 *
 * @returns A function that returns a pseudo-random number between 0 (inclusive) and 1 (exclusive) on each call.
 */
function createSfc32(a: number, b: number, c: number, d: number): () => number {
  return function (): number {
    // Bitweise ODER-Operationen zwingen die TypeScript/JavaScript-Engine,
    // die Zahlen intern als echte 32-Bit-Ganzzahlen (Int32) zu behandeln.
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;

    let t: number = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;

    // >>> 0 konvertiert die signed 32-Bit-Zahl in eine unsigned Zahl (0 bis 4294967295)
    return (t >>> 0) / 4294967296;
  };
}
