import wrap from 'word-wrap'
import { encodeHTML } from './html.js'

/** Retrieves num with suffix k(thousands) precise to given decimal places. */
const kFormatter = (num: number, precision?: number): string | number => {
  const abs = Math.abs(num)
  const sign = Math.sign(num)

  if (typeof precision === 'number' && !isNaN(precision)) {
    return (sign * (abs / 1000)).toFixed(precision) + 'k'
  }

  if (abs < 1000) {
    return sign * abs
  }

  return sign * parseFloat((abs / 1000).toFixed(1)) + 'k'
}

/** Convert bytes to a human-readable string representation. */
const formatBytes = (bytes: number): string => {
  if (bytes < 0) {
    throw new Error('Bytes must be a non-negative number')
  }

  if (bytes === 0) {
    return '0 B'
  }

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
  const base = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(base))

  if (i >= sizes.length) {
    throw new Error('Bytes is too large to convert to a human-readable string')
  }

  return `${(bytes / Math.pow(base, i)).toFixed(1)} ${sizes[i]}`
}

/** Split text over multiple lines based on the card width. */
const wrapTextMultiline = (text: string, width = 59, maxLines = 3): string[] => {
  const fullWidthComma = '，'
  const encoded = encodeHTML(text)
  const isChinese = encoded.includes(fullWidthComma)

  let wrapped: string[] = []

  if (isChinese) {
    wrapped = encoded.split(fullWidthComma) // Chinese full punctuation
  } else {
    wrapped = wrap(encoded, {
      width,
    }).split('\n') // Split wrapped lines to get an array of lines
  }

  const lines = wrapped.map((line) => line.trim()).slice(0, maxLines) // Only consider maxLines lines

  // Add "..." to the last line if the text exceeds maxLines
  if (wrapped.length > maxLines) {
    lines[maxLines - 1] += '...'
  }

  // Remove empty lines if text fits in less than maxLines lines
  const multiLineText = lines.filter(Boolean)
  return multiLineText
}

export { kFormatter, formatBytes, wrapTextMultiline }
