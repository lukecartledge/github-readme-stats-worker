// @ts-check

import { Card } from '../common/Card.js'
import { getCardColors } from '../common/color.js'
import { CustomError } from '../common/error.js'

const FIRE_ICON_PATH =
  'M8 1.2c.6 2.1-.5 3.3-1.5 4.3-.8.8-1.4 1.5-1.4 2.5 0 1.4 1.1 2.6 2.7 2.6 1.9 0 3-1.3 3-3.2 0-1.1-.4-2-.9-2.9 2 .8 3.3 2.7 3.3 5 0 3.1-2.4 5.5-5.4 5.5S2 12.6 2 9.6c0-2.5 1.3-4.4 3.3-5.4-.2.5-.3 1-.3 1.6 0 .8.3 1.4.7 1.9.5-.9 1.2-1.5 1.8-2.2C8.2 4.7 9 3.7 8 1.2z'

const DEFAULT_STREAK = {
  start: '',
  end: '',
  length: 0,
}

const safeDateFormat = (date, locale) => {
  if (!date) {
    return 'N/A'
  }

  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  } catch {
    return date
  }
}

const getStyles = ({ titleColor, textColor, iconColor, ringColor }) => {
  return `
    .title {
      font: 600 13px 'Segoe UI', Ubuntu, sans-serif;
      fill: ${titleColor};
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    .value {
      font: 700 26px 'Segoe UI', Ubuntu, sans-serif;
      fill: ${textColor};
      animation: numberPop 420ms ease-out forwards;
      transform-origin: center;
    }
    .label {
      font: 500 12px 'Segoe UI', Ubuntu, sans-serif;
      fill: ${textColor};
      opacity: 0.85;
    }
    .sub {
      font: 400 11px 'Segoe UI', Ubuntu, sans-serif;
      fill: ${textColor};
      opacity: 0.7;
    }
    .fire-wrap {
      transform-origin: center;
      animation: firePulse 1400ms ease-in-out infinite;
    }
    .fire {
      fill: ${iconColor};
    }
    .ring {
      fill: none;
      stroke: ${ringColor};
      stroke-width: 2.5;
      stroke-dasharray: 4 5;
      opacity: 0.5;
    }
    @keyframes firePulse {
      0% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); opacity: 0.85; }
    }
    @keyframes numberPop {
      0% { transform: scale(0.96); opacity: 0.6; }
      100% { transform: scale(1); opacity: 1; }
    }
  `
}

const renderColumn = ({ x, title, value, subTop, subBottom }) => {
  return `
    <g transform="translate(${x}, 0)">
      <text class="title" text-anchor="middle" x="0" y="8">${title}</text>
      <text class="value" text-anchor="middle" x="0" y="48">${value}</text>
      <text class="label" text-anchor="middle" x="0" y="68">${subTop}</text>
      <text class="sub" text-anchor="middle" x="0" y="84">${subBottom}</text>
    </g>
  `
}

const renderStreakCard = (data, options = {}) => {
  if (!data || typeof data.totalContributions !== 'number') {
    throw new CustomError('Could not render streak card.', 'Streak data is required.')
  }

  const {
    title_color,
    text_color,
    bg_color,
    border_color,
    theme = 'default',
    hide_border = false,
    border_radius,
    locale,
    disable_animations = false,
  } = options

  const { titleColor, textColor, iconColor, bgColor, borderColor, ringColor } = getCardColors({
    title_color,
    text_color,
    bg_color,
    border_color,
    theme,
  })

  const currentStreak = data.currentStreak || DEFAULT_STREAK
  const longestStreak = data.longestStreak || DEFAULT_STREAK
  const currentDateRange = currentStreak.length
    ? `${safeDateFormat(currentStreak.start, locale)} - ${safeDateFormat(currentStreak.end, locale)}`
    : 'No active streak'
  const longestDateRange = longestStreak.length
    ? `${safeDateFormat(longestStreak.start, locale)} - ${safeDateFormat(longestStreak.end, locale)}`
    : 'No streak recorded'

  const card = new Card({
    defaultTitle: 'Contribution Streak',
    width: 760,
    height: 180,
    border_radius,
    colors: {
      titleColor,
      textColor,
      iconColor,
      bgColor,
      borderColor,
    },
  })

  card.setHideBorder(hide_border)
  card.setCSS(
    getStyles({
      titleColor,
      textColor,
      iconColor,
      ringColor,
    }),
  )

  if (disable_animations) {
    card.disableAnimations()
  }

  card.setAccessibilityLabel({
    title: 'Contribution Streak Card',
    desc: `Total contributions ${data.totalContributions}, current streak ${currentStreak.length} days, longest streak ${longestStreak.length} days`,
  })

  const middleColumn = `
    <g transform="translate(380, 0)">
      <text class="title" text-anchor="middle" x="0" y="8">Current Streak</text>
      <g class="fire-wrap" transform="translate(0, 27)">
        <circle class="ring" cx="0" cy="0" r="16" />
        <svg viewBox="0 0 16 16" x="-8" y="-8" width="16" height="16" aria-hidden="true">
          <path class="fire" d="${FIRE_ICON_PATH}" />
        </svg>
      </g>
      <text class="value" text-anchor="middle" x="0" y="78">${currentStreak.length}</text>
      <text class="label" text-anchor="middle" x="0" y="98">days</text>
      <text class="sub" text-anchor="middle" x="0" y="114">${currentDateRange}</text>
    </g>
  `

  return card.render(`
    <g transform="translate(0, 10)">
      ${renderColumn({
        x: 145,
        title: 'Total Contributions',
        value: data.totalContributions,
        subTop: data.firstContribution
          ? `Since ${safeDateFormat(data.firstContribution, locale)}`
          : 'No contributions yet',
        subBottom: data.firstContribution ? 'all-time' : 'start coding today',
      })}
      ${middleColumn}
      ${renderColumn({
        x: 615,
        title: 'Longest Streak',
        value: longestStreak.length,
        subTop: 'days',
        subBottom: longestDateRange,
      })}
    </g>
  `)
}

export { renderStreakCard }
export default renderStreakCard
