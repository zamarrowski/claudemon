export const createPainter = (paintNow, schedule) => {
  let pending = false

  const flush = () => {
    pending = false
    paintNow()
  }

  return () => {
    if (pending) return

    pending = true
    schedule(flush)
  }
}
