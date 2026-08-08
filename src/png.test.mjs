import { crc32, deflateSync } from 'node:zlib'
import { expect, test } from 'vitest'

import { PNG_SIGNATURE_BYTES } from './constants.mjs'
import { decodePng, encodePng } from './png.mjs'

const chunk = (type, data) => {
  const out = Buffer.alloc(data.length + 12)
  const typeBytes = Buffer.from(type, 'ascii')

  out.writeUInt32BE(data.length, 0)
  typeBytes.copy(out, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8)

  return out
}

const ihdrChunk = ({ width, height, bitDepth, colorType, interlace = 0 }) => {
  const data = Buffer.alloc(13)

  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = bitDepth
  data[9] = colorType
  data[12] = interlace

  return chunk('IHDR', data)
}

const rowToBytes = (row) => [row.filter, ...row.bytes]

const buildPng = (options) => {
  const chunks = [Buffer.from(PNG_SIGNATURE_BYTES), ihdrChunk(options)]

  if (options.palette) chunks.push(chunk('PLTE', Buffer.from(options.palette)))

  if (options.transparency)
    chunks.push(chunk('tRNS', Buffer.from(options.transparency)))

  chunks.push(
    chunk('IDAT', deflateSync(Buffer.from(options.rows.flatMap(rowToBytes)))),
  )
  chunks.push(chunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

const pixelAt = (image, x, y) => {
  const at = (y * image.width + x) * 4

  return Array.from(image.pixels.subarray(at, at + 4))
}

const greysOf = (image, y) => {
  return Array.from({ length: image.width }, (unused, x) => {
    return pixelAt(image, x, y)[0]
  })
}

test('Should expand 8-bit greyscale samples into opaque RGBA pixels', () => {
  const image = decodePng(
    buildPng({
      width: 3,
      height: 1,
      bitDepth: 8,
      colorType: 0,
      rows: [{ filter: 0, bytes: [0, 128, 255] }],
    }),
  )

  expect(image.width).toBe(3)
  expect(image.height).toBe(1)
  expect(image.pixels).toHaveLength(12)
  expect(pixelAt(image, 0, 0)).toEqual([0, 0, 0, 255])
  expect(pixelAt(image, 1, 0)).toEqual([128, 128, 128, 255])
  expect(pixelAt(image, 2, 0)).toEqual([255, 255, 255, 255])
})

test('Should decode 8-bit truecolour pixels and take the sub filter from three bytes back', () => {
  const image = decodePng(
    buildPng({
      width: 2,
      height: 1,
      bitDepth: 8,
      colorType: 2,
      rows: [{ filter: 1, bytes: [10, 20, 30, 250, 5, 5] }],
    }),
  )

  expect(pixelAt(image, 0, 0)).toEqual([10, 20, 30, 255])
  expect(pixelAt(image, 1, 0)).toEqual([4, 25, 35, 255])
})

test('Should read the alpha channel of an 8-bit greyscale-alpha image', () => {
  const image = decodePng(
    buildPng({
      width: 2,
      height: 1,
      bitDepth: 8,
      colorType: 4,
      rows: [{ filter: 0, bytes: [10, 0, 200, 128] }],
    }),
  )

  expect(pixelAt(image, 0, 0)).toEqual([10, 10, 10, 0])
  expect(pixelAt(image, 1, 0)).toEqual([200, 200, 200, 128])
})

test('Should keep the high byte of every sample in a 16-bit RGBA image', () => {
  const image = decodePng(
    buildPng({
      width: 2,
      height: 1,
      bitDepth: 16,
      colorType: 6,
      rows: [
        {
          filter: 0,
          bytes: [
            0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x01, 0xff, 0x02,
            0xff, 0x03, 0xff, 0x04, 0xff,
          ],
        },
      ],
    }),
  )

  expect(pixelAt(image, 0, 0)).toEqual([0x12, 0x56, 0x9a, 0xde])
  expect(pixelAt(image, 1, 0)).toEqual([1, 2, 3, 4])
})

test('Should map 8-bit palette indices to colours and take alpha from tRNS when the entry exists', () => {
  const image = decodePng(
    buildPng({
      width: 3,
      height: 1,
      bitDepth: 8,
      colorType: 3,
      palette: [255, 0, 0, 0, 255, 0, 0, 0, 255],
      transparency: [0, 128],
      rows: [{ filter: 0, bytes: [0, 1, 2] }],
    }),
  )

  expect(pixelAt(image, 0, 0)).toEqual([255, 0, 0, 0])
  expect(pixelAt(image, 1, 0)).toEqual([0, 255, 0, 128])
  expect(pixelAt(image, 2, 0)).toEqual([0, 0, 255, 255])
})

test('Should unpack 4-bit palette indices across the byte boundary', () => {
  const image = decodePng(
    buildPng({
      width: 3,
      height: 1,
      bitDepth: 4,
      colorType: 3,
      palette: [255, 0, 0, 0, 255, 0, 0, 0, 255],
      rows: [{ filter: 0, bytes: [0x21, 0x00] }],
    }),
  )

  expect(pixelAt(image, 0, 0)).toEqual([0, 0, 255, 255])
  expect(pixelAt(image, 1, 0)).toEqual([0, 255, 0, 255])
  expect(pixelAt(image, 2, 0)).toEqual([255, 0, 0, 255])
})

test('Should turn 1-bit greyscale samples into black and white pixels', () => {
  const image = decodePng(
    buildPng({
      width: 10,
      height: 1,
      bitDepth: 1,
      colorType: 0,
      rows: [{ filter: 0, bytes: [0b10110001, 0b01000000] }],
    }),
  )

  expect(greysOf(image, 0)).toEqual([255, 0, 255, 255, 0, 0, 0, 255, 0, 255])
  expect(pixelAt(image, 0, 0)).toEqual([255, 255, 255, 255])
})

test('Should scale 2-bit greyscale samples over the full range', () => {
  const image = decodePng(
    buildPng({
      width: 4,
      height: 1,
      bitDepth: 2,
      colorType: 0,
      rows: [{ filter: 0, bytes: [0b00011011] }],
    }),
  )

  expect(greysOf(image, 0)).toEqual([0, 85, 170, 255])
})

test('Should scale 4-bit greyscale samples over the full range', () => {
  const image = decodePng(
    buildPng({
      width: 3,
      height: 1,
      bitDepth: 4,
      colorType: 0,
      rows: [{ filter: 0, bytes: [0x18, 0xf0] }],
    }),
  )

  expect(greysOf(image, 0)).toEqual([17, 136, 255])
})

test('Should add the byte above and wrap past 255 when the up filter is used', () => {
  const image = decodePng(
    buildPng({
      width: 2,
      height: 2,
      bitDepth: 8,
      colorType: 0,
      rows: [
        { filter: 0, bytes: [10, 20] },
        { filter: 2, bytes: [1, 250] },
      ],
    }),
  )

  expect(greysOf(image, 0)).toEqual([10, 20])
  expect(greysOf(image, 1)).toEqual([11, 14])
})

test('Should add the mean of the left and above bytes when the average filter is used', () => {
  const image = decodePng(
    buildPng({
      width: 2,
      height: 2,
      bitDepth: 8,
      colorType: 0,
      rows: [
        { filter: 0, bytes: [10, 21] },
        { filter: 3, bytes: [1, 2] },
      ],
    }),
  )

  expect(greysOf(image, 1)).toEqual([6, 15])
})

test('Should pick the above, upper-left and left predictors when the paeth filter is used', () => {
  const image = decodePng(
    buildPng({
      width: 4,
      height: 2,
      bitDepth: 8,
      colorType: 0,
      rows: [
        { filter: 0, bytes: [55, 60, 70, 200] },
        { filter: 4, bytes: [251, 45, 20, 10] },
      ],
    }),
  )

  expect(greysOf(image, 1)).toEqual([50, 100, 120, 210])
})

test('Should join split IDAT chunks and ignore unknown chunks and bytes after IEND', () => {
  const raw = deflateSync(Buffer.from([0, 10, 20]))
  const png = Buffer.concat([
    Buffer.from(PNG_SIGNATURE_BYTES),
    ihdrChunk({ width: 2, height: 1, bitDepth: 8, colorType: 0 }),
    chunk('gAMA', Buffer.from([0x00, 0x01, 0x86, 0xa0])),
    chunk('IDAT', raw.subarray(0, 3)),
    chunk('IDAT', raw.subarray(3)),
    chunk('IEND', Buffer.alloc(0)),
    Buffer.from([1, 2, 3]),
  ])

  expect(greysOf(decodePng(png), 0)).toEqual([10, 20])
})

test('Should throw when the buffer does not start with the PNG signature', () => {
  expect(() => decodePng(Buffer.from('GIF89a; not a png at all'))).toThrow(
    'not a PNG',
  )
  expect(() => decodePng(Buffer.from([0x89, 0x50]))).toThrow('not a PNG')
})

test('Should throw when the file carries no IHDR', () => {
  const png = Buffer.concat([
    Buffer.from(PNG_SIGNATURE_BYTES),
    chunk('IEND', Buffer.alloc(0)),
  ])

  expect(() => decodePng(png)).toThrow('PNG has no IHDR')
})

test('Should throw for an interlaced PNG', () => {
  const png = buildPng({
    width: 1,
    height: 1,
    bitDepth: 8,
    colorType: 0,
    interlace: 1,
    rows: [{ filter: 0, bytes: [0] }],
  })

  expect(() => decodePng(png)).toThrow('interlaced PNGs are not supported')
})

test('Should throw for a colour type it cannot decode', () => {
  const png = buildPng({
    width: 1,
    height: 1,
    bitDepth: 8,
    colorType: 5,
    rows: [{ filter: 0, bytes: [0] }],
  })

  expect(() => decodePng(png)).toThrow('unsupported PNG colour type 5')
})

test('Should throw naming the row when a scanline uses an unknown filter', () => {
  const png = buildPng({
    width: 2,
    height: 2,
    bitDepth: 8,
    colorType: 0,
    rows: [
      { filter: 0, bytes: [1, 2] },
      { filter: 5, bytes: [3, 4] },
    ],
  })

  expect(() => decodePng(png)).toThrow('unsupported PNG filter 5 on row 1')
})

test('Should write a PNG that any decoder reads back pixel for pixel', () => {
  const pixels = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255, 9, 9, 9, 0,
  ])
  const bytes = encodePng({ width: 2, height: 2, pixels })

  expect(bytes.subarray(0, 8)).toEqual(Buffer.from(PNG_SIGNATURE_BYTES))
  expect(bytes.toString('ascii', 12, 16), 'the header comes first').toBe('IHDR')
  expect(bytes.toString('ascii', bytes.length - 8, bytes.length - 4)).toBe(
    'IEND',
  )

  const decoded = decodePng(bytes)

  expect(decoded.width).toBe(2)
  expect(decoded.height).toBe(2)
  expect([...decoded.pixels]).toEqual([...pixels])
})

test('Should sign every chunk it writes with a checksum the reader agrees with', () => {
  const bytes = encodePng({
    width: 1,
    height: 1,
    pixels: new Uint8Array([1, 2, 3, 255]),
  })
  const length = bytes.readUInt32BE(8)
  const body = bytes.subarray(12, 16 + length)

  expect(bytes.readUInt32BE(16 + length)).toBe(crc32(body))
})
