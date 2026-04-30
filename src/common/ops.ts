import toEmoji from 'emoji-name-map'

/** Returns boolean if value is either "true" or "false" else undefined. */
const parseBoolean = (value: string | boolean): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true
    } else if (value.toLowerCase() === 'false') {
      return false
    }
  }
  return undefined
}

/** Parse string to array of strings. */
const parseArray = (str: string): string[] => {
  if (!str) {
    return []
  }
  return str.split(',')
}

/** Clamp the given number between the given range. */
const clampValue = (number: number, min: number, max: number): number => {
  if (Number.isNaN(number)) {
    return min
  }
  return Math.max(min, Math.min(number, max))
}

/** Lowercase and trim string. */
const lowercaseTrim = (name: string): string => name.toLowerCase().trim()

/** Split array into chunks of perChunk size. */
const chunkArray = <T>(arr: T[], perChunk: number): T[][] => {
  return arr.reduce((resultArray: T[][], item: T, index: number) => {
    const chunkIndex = Math.floor(index / perChunk)

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] // start a new chunk
    }

    resultArray[chunkIndex].push(item)

    return resultArray
  }, [])
}

/** Parse emoji from string. */
const parseEmojis = (str: string): string => {
  if (!str) {
    throw new Error('[parseEmoji]: str argument not provided')
  }
  return str.replace(/:\w+:/gm, (emoji) => {
    return toEmoji.get(emoji) || ''
  })
}

/** Get diff in minutes between two dates. */
const dateDiff = (d1: Date, d2: Date): number => {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  const diff = date1.getTime() - date2.getTime()
  return Math.round(diff / (1000 * 60))
}

export { parseBoolean, parseArray, clampValue, lowercaseTrim, chunkArray, parseEmojis, dateDiff }
