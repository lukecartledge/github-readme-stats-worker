// @ts-check

import { Card } from '../common/Card.js'
import { getCardColors } from '../common/color.js'
import { CustomError } from '../common/error.js'

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

const getStyles = ({ titleColor, textColor }) => {
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

  const { titleColor, textColor, iconColor, bgColor, borderColor } = getCardColors({
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
    }),
  )

  if (disable_animations) {
    card.disableAnimations()
  }

  card.setAccessibilityLabel({
    title: 'Contribution Streak Card',
    desc: `Total contributions ${data.totalContributions}, current streak ${currentStreak.length} days, longest streak ${longestStreak.length} days`,
  })

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
      ${renderColumn({
        x: 380,
        title: 'Current Streak',
        value: currentStreak.length,
        subTop: 'days',
        subBottom: currentDateRange,
      })}
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
