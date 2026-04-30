import { SECONDARY_ERROR_MESSAGES, TRY_AGAIN_LATER } from './error.js'
import { getCardColors } from './color.js'
import { encodeHTML } from './html.js'
import { clampValue } from './ops.js'

interface FlexLayoutProps {
  items: string[]
  gap: number
  direction?: 'column' | 'row'
  sizes?: number[]
}

/** Auto layout utility, allows us to layout things vertically or horizontally with proper gaping. */
const flexLayout = ({ items, gap, direction, sizes = [] }: FlexLayoutProps): string[] => {
  let lastSize = 0
  // filter() for filtering out empty strings
  return items.filter(Boolean).map((item, i) => {
    const size = sizes[i] || 0
    let transform = `translate(${lastSize}, 0)`
    if (direction === 'column') {
      transform = `translate(0, ${lastSize})`
    }
    lastSize += size + gap
    return `<g transform="${transform}">${item}</g>`
  })
}

/** Creates a node to display the primary programming language of the repository/gist. */
const createLanguageNode = (langName: string, langColor: string): string => {
  return `
    <g data-testid="primary-lang">
      <circle data-testid="lang-color" cx="0" cy="-5" r="6" fill="${langColor}" />
      <text data-testid="lang-name" class="gray" x="15">${langName}</text>
    </g>
    `
}

interface CreateProgressNodeParams {
  x: number
  y: number
  width: number
  color: string
  progress: number
  progressBarBackgroundColor: string
  delay: number
}

/** Create a node to indicate progress in percentage along a horizontal line. */
const createProgressNode = ({
  x,
  y,
  width,
  color,
  progress,
  progressBarBackgroundColor,
  delay,
}: CreateProgressNodeParams): string => {
  const progressPercentage = clampValue(progress, 2, 100)

  return `
    <svg width="${width}" x="${x}" y="${y}">
      <rect rx="5" ry="5" x="0" y="0" width="${width}" height="8" fill="${progressBarBackgroundColor}"></rect>
      <svg data-testid="lang-progress" width="${progressPercentage}%">
        <rect
            height="8"
            fill="${color}"
            rx="5" ry="5" x="0" y="0"
            class="lang-progress"
            style="animation-delay: ${delay}ms;"
        />
      </svg>
    </svg>
  `
}

/** Creates an icon with label to display repository/gist stats like forks, stars, etc. */
const iconWithLabel = (icon: string, label: number | string, testid: string, iconSize: number): string => {
  if (typeof label === 'number' && label <= 0) {
    return ''
  }
  const iconSvg = `
      <svg
        class="icon"
        y="-12"
        viewBox="0 0 16 16"
        version="1.1"
        width="${iconSize}"
        height="${iconSize}"
      >
        ${icon}
      </svg>
    `
  const text = `<text data-testid="${testid}" class="gray">${label}</text>`
  return flexLayout({ items: [iconSvg, text], gap: 20 }).join('')
}

// Script parameters.
const ERROR_CARD_LENGTH = 576.5

const UPSTREAM_API_ERRORS = [TRY_AGAIN_LATER, SECONDARY_ERROR_MESSAGES.MAX_RETRY]

interface RenderErrorOptions {
  title_color?: string
  text_color?: string
  bg_color?: string
  border_color?: string
  theme?: string
  show_repo_link?: boolean
}

interface RenderErrorArgs {
  message: string
  secondaryMessage?: string
  renderOptions?: RenderErrorOptions
}

/** Renders error message on the card. */
const renderError = ({ message, secondaryMessage = '', renderOptions = {} }: RenderErrorArgs): string => {
  const {
    title_color,
    text_color,
    bg_color,
    border_color,
    theme = 'default',
    show_repo_link = true,
  } = renderOptions

  // returns theme based colors with proper overrides and defaults
  const { titleColor, textColor, bgColor, borderColor } = getCardColors({
    title_color,
    text_color,
    icon_color: '',
    bg_color,
    border_color,
    ring_color: '',
    theme,
  })

  return `
    <svg width="${ERROR_CARD_LENGTH}"  height="120" viewBox="0 0 ${ERROR_CARD_LENGTH} 120" fill="${bgColor}" xmlns="http://www.w3.org/2000/svg">
    <style>
    .text { font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${titleColor} }
    .small { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textColor} }
    .gray { fill: #858585 }
    </style>
    <rect x="0.5" y="0.5" width="${
      ERROR_CARD_LENGTH - 1
    }" height="99%" rx="4.5" fill="${bgColor}" stroke="${borderColor}"/>
    <text x="25" y="45" class="text">Something went wrong!${
      UPSTREAM_API_ERRORS.includes(secondaryMessage) || !show_repo_link
        ? ''
        : ' file an issue at https://tiny.one/readme-stats'
    }</text>
    <text data-testid="message" x="25" y="55" class="text small">
      <tspan x="25" dy="18">${encodeHTML(message)}</tspan>
      <tspan x="25" dy="18" class="gray">${secondaryMessage}</tspan>
    </text>
    </svg>
  `
}

/**
 * Retrieve text length.
 * @see https://stackoverflow.com/a/48172630/10629172
 */
const measureText = (str: string, fontSize = 10): number => {
  // prettier-ignore
  const widths = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0.2796875, 0.2765625,
    0.3546875, 0.5546875, 0.5546875, 0.8890625, 0.665625, 0.190625,
    0.3328125, 0.3328125, 0.3890625, 0.5828125, 0.2765625, 0.3328125,
    0.2765625, 0.3015625, 0.5546875, 0.5546875, 0.5546875, 0.5546875,
    0.5546875, 0.5546875, 0.5546875, 0.5546875, 0.5546875, 0.5546875,
    0.2765625, 0.2765625, 0.584375, 0.5828125, 0.584375, 0.5546875,
    1.0140625, 0.665625, 0.665625, 0.721875, 0.721875, 0.665625,
    0.609375, 0.7765625, 0.721875, 0.2765625, 0.5, 0.665625,
    0.5546875, 0.8328125, 0.721875, 0.7765625, 0.665625, 0.7765625,
    0.721875, 0.665625, 0.609375, 0.721875, 0.665625, 0.94375,
    0.665625, 0.665625, 0.609375, 0.2765625, 0.3546875, 0.2765625,
    0.4765625, 0.5546875, 0.3328125, 0.5546875, 0.5546875, 0.5,
    0.5546875, 0.5546875, 0.2765625, 0.5546875, 0.5546875, 0.221875,
    0.240625, 0.5, 0.221875, 0.8328125, 0.5546875, 0.5546875,
    0.5546875, 0.5546875, 0.3328125, 0.5, 0.2765625, 0.5546875,
    0.5, 0.721875, 0.5, 0.5, 0.5, 0.3546875, 0.259375, 0.353125, 0.5890625,
  ];

  const avg = 0.5279276315789471
  return (
    str
      .split('')
      .map((c) => (c.charCodeAt(0) < widths.length ? widths[c.charCodeAt(0)] : avg))
      .reduce((cur, acc) => acc + cur) * fontSize
  )
}

export {
  ERROR_CARD_LENGTH,
  renderError,
  createLanguageNode,
  createProgressNode,
  iconWithLabel,
  flexLayout,
  measureText,
}
