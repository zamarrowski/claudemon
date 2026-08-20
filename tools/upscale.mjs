export const upscaleImage = ({ width, height, pixels }, factor) => {
  const scaledWidth = width * factor
  const scaledHeight = height * factor
  const scaled = new Uint8Array(scaledWidth * scaledHeight * 4)

  for (let y = 0; y < scaledHeight; y++) {
    const row = Math.floor(y / factor) * width

    for (let x = 0; x < scaledWidth; x++) {
      const from = (row + Math.floor(x / factor)) * 4

      scaled.set(pixels.subarray(from, from + 4), (y * scaledWidth + x) * 4)
    }
  }

  return { width: scaledWidth, height: scaledHeight, pixels: scaled }
}
