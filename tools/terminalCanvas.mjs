const fontOf = (size, family, bold) => {
  return `${bold ? 'bold ' : ''}${size}px ${family}`
}

const fitFontSize = (ctx, data) => {
  const probe = data.cellWidth * 2

  ctx.font = fontOf(probe, data.font, false)

  return (probe * data.cellWidth) / ctx.measureText(data.advanceSample).width
}

const baselineOf = (ctx, cellHeight) => {
  const metrics = ctx.measureText(' ')
  const box = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent

  return (cellHeight - box) / 2 + metrics.fontBoundingBoxAscent
}

const layoutOf = (ctx, data) => {
  const fontSize = fitFontSize(ctx, data)

  ctx.font = fontOf(fontSize, data.font, false)

  return {
    fontSize,
    baseline: baselineOf(ctx, data.cellHeight),
    stroke: Math.round(data.cellWidth / data.strokeDivisor),
  }
}

const fillRect = (ctx, colour, x, y, width, height) => {
  ctx.fillStyle = colour

  ctx.fillRect(x, y, width, height)
}

const fillBlocks = (ctx, data, rects, cell, left, top) => {
  for (const [x0, y0, x1, y1] of rects)
    fillRect(
      ctx,
      cell.fg,
      left + x0 * data.cellWidth,
      top + y0 * data.cellHeight,
      (x1 - x0) * data.cellWidth,
      (y1 - y0) * data.cellHeight,
    )
}

const strokeSegment = (ctx, data, layout, segment, cell, left, top) => {
  const [axis, from, to] = segment

  if (axis === 'h')
    return fillRect(
      ctx,
      cell.fg,
      left + from * data.cellWidth,
      top + (data.cellHeight - layout.stroke) / 2,
      (to - from) * data.cellWidth,
      layout.stroke,
    )

  return fillRect(
    ctx,
    cell.fg,
    left + (data.cellWidth - layout.stroke) / 2,
    top + from * data.cellHeight,
    layout.stroke,
    (to - from) * data.cellHeight,
  )
}

const fillShade = (ctx, data, cell, left, top) => {
  const step = data.shadePeriod
  const dot = step / 2

  for (let y = top; y < top + data.cellHeight; y += step)
    for (let x = left; x < left + data.cellWidth; x += step)
      fillRect(ctx, cell.fg, x, y, dot, dot)
}

const drawGlyph = (ctx, data, layout, cell, left, top) => {
  const room = data.cellWidth * (cell.wide ? 2 : 1)

  ctx.font = fontOf(layout.fontSize, data.font, cell.bold)
  ctx.fillStyle = cell.fg

  const width = ctx.measureText(cell.char).width
  const squeeze = width > room ? (room * data.symbolFit) / width : 1

  ctx.save()
  ctx.translate(left + room / 2, top + layout.baseline)
  ctx.scale(squeeze, 1)
  ctx.fillText(cell.char, 0, 0)
  ctx.restore()
}

const drawCell = (ctx, data, layout, cell, col, row) => {
  const left = col * data.cellWidth
  const top = row * data.cellHeight

  if (cell.bg)
    fillRect(ctx, cell.bg, left, top, data.cellWidth, data.cellHeight)

  if (cell.char === ' ' || cell.char === '') return

  if (data.blocks[cell.char])
    return fillBlocks(ctx, data, data.blocks[cell.char], cell, left, top)

  if (data.boxes[cell.char]) {
    for (const segment of data.boxes[cell.char])
      strokeSegment(ctx, data, layout, segment, cell, left, top)

    return
  }

  if (data.shades.includes(cell.char))
    return fillShade(ctx, data, cell, left, top)

  drawGlyph(ctx, data, layout, cell, left, top)
}

export const drawTerminal = (canvas, data) => {
  const ctx = canvas.getContext('2d')

  canvas.width = data.cols * data.cellWidth
  canvas.height = data.rows * data.cellHeight

  fillRect(ctx, data.background, 0, 0, canvas.width, canvas.height)

  const layout = layoutOf(ctx, data)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  data.cells.forEach((cells, row) =>
    cells.forEach((cell, col) => drawCell(ctx, data, layout, cell, col, row)),
  )

  return canvas
}
