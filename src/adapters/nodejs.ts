import { Tokens } from 'marked'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'

import { MarkdownImageAdapter } from '../types'
import { getImageExtension, isHttp } from '../utils'
import { getImageDimensions } from './image-dimensions'

export const downloadImage: MarkdownImageAdapter = async function (token: Tokens.Image) {
  const src = token.href
  if (!src) {
    return null
  }

  try {
    const buffer = await loadImage(src)

    const size = getImageDimensions(buffer)
    if (!size) {
      return null
    }

    const { width, height, type } = size

    const supportType = getImageExtension(src, type)

    if (!supportType) {
      return null
    }

    return {
      type: supportType,
      data: buffer,
      width: width,
      height: height,
    }
  } catch (error) {
    console.error(`[MarkdownDocx] downloadImageError`, error)
    return null
  }
}

function loadImage (src: string) {
  if (isHttp(src)) {
    return new Promise<Buffer>((resolve, reject) => {
      const agent = src.startsWith('https') ? https : http
      agent.get(src, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => {
          chunks.push(chunk)
        })
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve(buffer)
        })
        res.on('error', (err) => {
          reject(new Error(`Failed to load image: ${err.message || err}`))
        })
      })
    })
  }
  return fs.readFile(src)
}
