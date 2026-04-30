import { themes } from '../../themes/index.js'

type ThemeMap = Record<string, {
  title_color: string
  icon_color: string
  text_color: string
  bg_color: string
  border_color?: string
  ring_color?: string
}>

const typedThemes = themes as ThemeMap

/** Checks if a string is a valid hex color. */
const isValidHexColor = (hexColor: string): boolean => {
  return new RegExp(/^([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/).test(
    hexColor,
  )
}

/** Check if the given array represents a valid gradient (first element is angle, rest are hex colors). */
const isValidGradient = (colors: string[]): boolean => {
  return colors.length > 2 && colors.slice(1).every((color) => isValidHexColor(color))
}

/** Retrieves a gradient if color has more than one valid hex codes else a single color. */
const fallbackColor = (color: string, fallbackColor: string | string[]): string | string[] => {
  let gradient: string[] | null = null

  let colors = color ? color.split(',') : []
  if (colors.length > 1 && isValidGradient(colors)) {
    gradient = colors
  }

  return (gradient ? gradient : isValidHexColor(color) && `#${color}`) || fallbackColor
}

export interface CardColors {
  titleColor: string
  iconColor: string
  textColor: string
  bgColor: string | string[]
  borderColor: string
  ringColor: string
}

interface GetCardColorsArgs {
  title_color?: string
  text_color?: string
  icon_color?: string
  bg_color?: string
  border_color?: string
  ring_color?: string
  theme?: string
}

/** Returns theme based colors with proper overrides and defaults. */
const getCardColors = ({
  title_color,
  text_color,
  icon_color,
  bg_color,
  border_color,
  ring_color,
  theme,
}: GetCardColorsArgs): CardColors => {
  const defaultTheme = typedThemes['default']
  const isThemeProvided = theme !== null && theme !== undefined

  const selectedTheme = isThemeProvided ? typedThemes[theme!] : defaultTheme

  const titleColor = fallbackColor(
    title_color || selectedTheme.title_color,
    `#${defaultTheme.title_color}`,
  )
  const iconColor = fallbackColor(
    icon_color || selectedTheme.icon_color,
    `#${defaultTheme.icon_color}`,
  )
  const textColor = fallbackColor(
    text_color || selectedTheme.text_color,
    `#${defaultTheme.text_color}`,
  )
  const bgColor = fallbackColor(
    bg_color || selectedTheme.bg_color,
    `#${defaultTheme.bg_color}`,
  )

  const borderColorValue = border_color || selectedTheme.border_color || defaultTheme.border_color || defaultTheme.title_color
  const borderColor = fallbackColor(borderColorValue, `#${defaultTheme.title_color}`)

  const ringColorValue = ring_color || selectedTheme.ring_color || selectedTheme.title_color
  const ringColor = fallbackColor(ringColorValue, `#${defaultTheme.title_color}`)

  if (
    typeof titleColor !== 'string' ||
    typeof textColor !== 'string' ||
    typeof ringColor !== 'string' ||
    typeof iconColor !== 'string' ||
    typeof borderColor !== 'string'
  ) {
    throw new Error('Unexpected behavior, all colors except background should be string.')
  }

  return { titleColor, iconColor, textColor, bgColor, borderColor, ringColor }
}

export { isValidHexColor, isValidGradient, getCardColors }
