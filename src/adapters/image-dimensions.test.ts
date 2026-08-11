import { describe, expect, it } from 'vitest'

import { getImageDimensions } from './image-dimensions'

describe('getImageDimensions', () => {
  it('reads PNG dimensions from a valid IHDR header', () => {
    const image = Buffer.alloc(24)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(image)
    image.write('IHDR', 12, 'ascii')
    image.writeUInt32BE(640, 16)
    image.writeUInt32BE(480, 20)

    expect(getImageDimensions(image)).toEqual({ width: 640, height: 480, type: 'image/png' })
  })

  it('reads GIF dimensions from the logical screen descriptor', () => {
    const image = Buffer.alloc(10)
    image.write('GIF89a', 0, 'ascii')
    image.writeUInt16LE(320, 6)
    image.writeUInt16LE(200, 8)

    expect(getImageDimensions(image)).toEqual({ width: 320, height: 200, type: 'image/gif' })
  })

  it('reads Windows and OS/2 BMP dimensions', () => {
    const windowsBmp = Buffer.alloc(26)
    windowsBmp.write('BM', 0, 'ascii')
    windowsBmp.writeUInt32LE(40, 14)
    windowsBmp.writeInt32LE(800, 18)
    windowsBmp.writeInt32LE(-600, 22)

    const os2Bmp = Buffer.alloc(26)
    os2Bmp.write('BM', 0, 'ascii')
    os2Bmp.writeUInt32LE(12, 14)
    os2Bmp.writeUInt16LE(160, 18)
    os2Bmp.writeUInt16LE(120, 20)

    expect(getImageDimensions(windowsBmp)).toEqual({ width: 800, height: 600, type: 'image/bmp' })
    expect(getImageDimensions(os2Bmp)).toEqual({ width: 160, height: 120, type: 'image/bmp' })
  })

  it('reads JPEG dimensions from a bounded start-of-frame segment scan', () => {
    const image = Buffer.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80,
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    ])

    expect(getImageDimensions(image)).toEqual({ width: 640, height: 480, type: 'image/jpeg' })
  })

  it('rejects malformed, truncated, unsupported, and zero-sized inputs', () => {
    const malformedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00])
    const zeroPng = Buffer.alloc(24)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(zeroPng)
    zeroPng.write('IHDR', 12, 'ascii')

    expect(getImageDimensions(Buffer.alloc(0))).toBeNull()
    expect(getImageDimensions(Buffer.from('icns'))).toBeNull()
    expect(getImageDimensions(Buffer.from('JXL '))).toBeNull()
    expect(getImageDimensions(Buffer.from('ftypheic'))).toBeNull()
    expect(getImageDimensions(malformedJpeg)).toBeNull()
    expect(getImageDimensions(zeroPng)).toBeNull()
  })
})
