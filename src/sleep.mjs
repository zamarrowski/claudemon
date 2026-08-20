const SIGNAL = new Int32Array(new SharedArrayBuffer(4))

export const sleep = (ms) => {
  if (!(ms > 0)) return

  Atomics.wait(SIGNAL, 0, 0, ms)
}
