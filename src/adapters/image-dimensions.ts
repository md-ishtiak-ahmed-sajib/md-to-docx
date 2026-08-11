const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
])

function dimensions(width: number, height: number, type: string) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return null
  }

  return { width, height, type }
}

function pngDimensions(buffer: Buffer) {
  if (buffer.length < 24
    || buffer[0] !== 0x89
    || buffer.toString('ascii', 1, 4) !== 'PNG'
    || buffer[4] !== 0x0d
    || buffer[5] !== 0x0a
    || buffer[6] !== 0x1a
    || buffer[7] !== 0x0a
    || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    return null
  }

  return dimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20), 'image/png')
}

function gifDimensions(buffer: Buffer) {
  if (buffer.length < 10) {
    return null
  }

  const signature = buffer.toString('ascii', 0, 6)
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    return null
  }

  return dimensions(buffer.readUInt16LE(6), buffer.readUInt16LE(8), 'image/gif')
}

function bmpDimensions(buffer: Buffer) {
  if (buffer.length < 26 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
    return null
  }

  const dibHeaderSize = buffer.readUInt32LE(14)
  if (dibHeaderSize === 12) {
    return dimensions(buffer.readUInt16LE(18), buffer.readUInt16LE(20), 'image/bmp')
  }

  if (dibHeaderSize < 40) {
    return null
  }

  return dimensions(Math.abs(buffer.readInt32LE(18)), Math.abs(buffer.readInt32LE(22)), 'image/bmp')
}

function jpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null
  }

  let offset = 2
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1
    }
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1
    }
    if (offset >= buffer.length) {
      return null
    }

    const marker = buffer[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) {
      return null
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue
    }
    if (offset + 2 > buffer.length) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        return null
      }
      return dimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3), 'image/jpeg')
    }

    offset += segmentLength
  }

  return null
}

export function getImageDimensions(data: Uint8Array) {
  const buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength)

  return pngDimensions(buffer)
    ?? gifDimensions(buffer)
    ?? bmpDimensions(buffer)
    ?? jpegDimensions(buffer)
}
