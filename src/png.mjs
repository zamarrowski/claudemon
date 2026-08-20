import { deflateSync, inflateSync } from 'node:zlib'
import {
  PNG_BIT_DEPTH,
  PNG_CHANNELS,
  PNG_COLOR_TYPE_RGBA,
  PNG_CRC_POLYNOMIAL,
  PNG_CRC_SEED,
  PNG_DEFLATE_LEVEL,
  PNG_FILTER_AVERAGE,
  PNG_FILTER_NONE,
  PNG_FILTER_PAETH,
  PNG_FILTER_SUB,
  PNG_FILTER_UP,
  PNG_SIGNATURE_BYTES,
} from './constants.mjs'

export const SIGNATURE = Buffer.from(PNG_SIGNATURE_BYTES)

const buildCrcTable = () => {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index++) {
    let value = index

    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? PNG_CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1
    }

    table[index] = value
  }

  return table
}

const CRC_TABLE = buildCrcTable()

const crc32 = (bytes) => {
  let crc = PNG_CRC_SEED

  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)

  return (crc ^ PNG_CRC_SEED) >>> 0
}

const paeth = (left, above, upperLeft) => {
  const estimate = left + above - upperLeft
  const dLeft = Math.abs(estimate - left)
  const dAbove = Math.abs(estimate - above)
  const dUpperLeft = Math.abs(estimate - upperLeft)

  if (dLeft <= dAbove && dLeft <= dUpperLeft) return left
  if (dAbove <= dUpperLeft) return above

  return upperLeft
}

const unfilter = (raw, width, height, channels, bitDepth) => {
  const bytesPerPixel = Math.max(1, Math.ceil((channels * bitDepth) / 8))
  const scanlineBytes = Math.ceil((width * channels * bitDepth) / 8)
  const out = Buffer.alloc(height * scanlineBytes)

  let rawOffset = 0

  for (let row = 0; row < height; row++) {
    const filter = raw[rawOffset++]
    const lineStart = row * scanlineBytes
    const prevStart = lineStart - scanlineBytes

    for (let i = 0; i < scanlineBytes; i++) {
      const value = raw[rawOffset + i]
      const left = i >= bytesPerPixel ? out[lineStart + i - bytesPerPixel] : 0
      const above = row > 0 ? out[prevStart + i] : 0
      const upperLeft =
        row > 0 && i >= bytesPerPixel ? out[prevStart + i - bytesPerPixel] : 0

      let restored

      switch (filter) {
        case 0:
          restored = value
          break
        case 1:
          restored = value + left
          break
        case 2:
          restored = value + above
          break
        case 3:
          restored = value + ((left + above) >> 1)
          break
        case 4:
          restored = value + paeth(left, above, upperLeft)
          break
        default:
          throw new Error(`unsupported PNG filter ${filter} on row ${row}`)
      }

      out[lineStart + i] = restored & 0xff
    }

    rawOffset += scanlineBytes
  }

  return { data: out, scanlineBytes }
}

const readPacked = (line, index, bitDepth) => {
  const perByte = 8 / bitDepth
  const byte = line[Math.floor(index / perByte)]
  const shift = 8 - bitDepth * ((index % perByte) + 1)

  return (byte >> shift) & ((1 << bitDepth) - 1)
}

const sampleAt = (line, base, channel, stride) => line[base + channel * stride]

export const decodePng = (buffer) => {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG')

  let header = null
  let palette = null
  let transparency = null
  const idatChunks = []

  let offset = 8

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === 'PLTE') {
      palette = data
    } else if (type === 'tRNS') {
      transparency = data
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }

    offset += 12 + length
  }

  if (!header) throw new Error('PNG has no IHDR')
  if (header.interlace) throw new Error('interlaced PNGs are not supported')

  const channels = PNG_CHANNELS[header.colorType]

  if (!channels)
    throw new Error(`unsupported PNG colour type ${header.colorType}`)

  const { width, height, bitDepth, colorType } = header
  const raw = inflateSync(Buffer.concat(idatChunks))
  const { data, scanlineBytes } = unfilter(
    raw,
    width,
    height,
    channels,
    bitDepth,
  )

  const pixels = new Uint8Array(width * height * 4)
  const maxSample = (1 << bitDepth) - 1

  for (let y = 0; y < height; y++) {
    const line = data.subarray(y * scanlineBytes, (y + 1) * scanlineBytes)

    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4
      let r
      let g
      let b
      let a = 255

      if (colorType === 3) {
        const index = bitDepth === 8 ? line[x] : readPacked(line, x, bitDepth)

        r = palette[index * 3]
        g = palette[index * 3 + 1]
        b = palette[index * 3 + 2]

        if (transparency && index < transparency.length) a = transparency[index]
      } else if (bitDepth === 8 || bitDepth === 16) {
        const stride = bitDepth === 16 ? 2 : 1
        const base = x * channels * stride

        if (colorType === 0) {
          r = g = b = sampleAt(line, base, 0, stride)
        } else if (colorType === 4) {
          r = g = b = sampleAt(line, base, 0, stride)
          a = sampleAt(line, base, 1, stride)
        } else {
          r = sampleAt(line, base, 0, stride)
          g = sampleAt(line, base, 1, stride)
          b = sampleAt(line, base, 2, stride)

          if (colorType === 6) a = sampleAt(line, base, 3, stride)
        }
      } else {
        const sample = readPacked(line, x * channels, bitDepth)

        r = g = b = Math.round((sample / maxSample) * 255)
      }

      pixels[target] = r
      pixels[target + 1] = g
      pixels[target + 2] = b
      pixels[target + 3] = a
    }
  }

  return { width, height, pixels }
}

const chunk = (type, data) => {
  const out = Buffer.alloc(data.length + 12)

  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)

  return out
}

const headerChunk = (width, height) => {
  const data = Buffer.alloc(13)

  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = PNG_BIT_DEPTH
  data[9] = PNG_COLOR_TYPE_RGBA

  return chunk('IHDR', data)
}

const CHANNELS = PNG_CHANNELS[PNG_COLOR_TYPE_RGBA]

const FILTERS = [
  PNG_FILTER_NONE,
  PNG_FILTER_SUB,
  PNG_FILTER_UP,
  PNG_FILTER_AVERAGE,
  PNG_FILTER_PAETH,
]

const filterByte = (filter, value, left, above, upperLeft) => {
  if (filter === PNG_FILTER_SUB) return value - left
  if (filter === PNG_FILTER_UP) return value - above
  if (filter === PNG_FILTER_AVERAGE) return value - ((left + above) >> 1)
  if (filter === PNG_FILTER_PAETH) return value - paeth(left, above, upperLeft)

  return value
}

const filterInto = (out, at, filter, row, previous) => {
  for (let index = 0; index < row.length; index++) {
    const left = index >= CHANNELS ? row[index - CHANNELS] : 0
    const above = previous[index]
    const upperLeft = index >= CHANNELS ? previous[index - CHANNELS] : 0

    out[at + index] =
      filterByte(filter, row[index], left, above, upperLeft) & 0xff
  }

  return out
}

const deviation = (bytes, length) => {
  let total = 0

  for (let index = 0; index < length; index++)
    total += bytes[index] < 128 ? bytes[index] : 256 - bytes[index]

  return total
}

const bestFilter = (candidate, row, previous) => {
  let chosen = PNG_FILTER_NONE
  let lowest = Infinity

  for (const filter of FILTERS) {
    filterInto(candidate, 0, filter, row, previous)

    const score = deviation(candidate, row.length)

    if (score < lowest) {
      lowest = score
      chosen = filter
    }
  }

  return chosen
}

const plainRows = ({ width, height, pixels }) => {
  const stride = width * CHANNELS
  const raw = Buffer.alloc(height * (stride + 1))

  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1)

    raw[start] = PNG_FILTER_NONE
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), start + 1)
  }

  return raw
}

const filteredRows = (image) => {
  const stride = image.width * CHANNELS
  const raw = Buffer.alloc(image.height * (stride + 1))
  const candidate = Buffer.alloc(stride)
  let previous = Buffer.alloc(stride)

  for (let y = 0; y < image.height; y++) {
    const row = image.pixels.subarray(y * stride, (y + 1) * stride)
    const at = y * (stride + 1)
    const filter = bestFilter(candidate, row, previous)

    raw[at] = filter
    filterInto(raw, at + 1, filter, row, previous)
    previous = row
  }

  return raw
}

const packed = (raw) => deflateSync(raw, { level: PNG_DEFLATE_LEVEL })

const withIdat = (image, idat) => {
  return Buffer.concat([
    SIGNATURE,
    headerChunk(image.width, image.height),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export const encodePng = (image) => withIdat(image, packed(plainRows(image)))

export const encodeSmallestPng = (image) => {
  const plain = packed(plainRows(image))
  const filtered = packed(filteredRows(image))

  return withIdat(image, filtered.length < plain.length ? filtered : plain)
}
