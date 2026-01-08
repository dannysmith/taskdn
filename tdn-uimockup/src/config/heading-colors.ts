import type { HeadingColor } from '@/types/headings'

export interface HeadingColorConfig {
  label: string
  /** Tailwind classes for the text and border color */
  textClass: string
  borderClass: string
  /** Tailwind class for the color dot in the picker */
  dotClass: string
  /** Tailwind class for the check icon color (contrast-safe for WCAG 4.5:1) */
  checkClass: string
}

export const headingColorConfig: Record<HeadingColor, HeadingColorConfig> = {
  default: {
    label: 'Default',
    textClass: 'text-foreground',
    borderClass: 'border-border',
    dotClass: 'bg-foreground',
    checkClass: 'text-white dark:text-black',
  },
  blue: {
    label: 'Blue',
    textClass: 'text-heading-blue',
    borderClass: 'border-heading-blue/30',
    dotClass: 'bg-heading-blue',
    checkClass: 'text-white dark:text-black',
  },
  teal: {
    label: 'Teal',
    textClass: 'text-heading-teal',
    borderClass: 'border-heading-teal/30',
    dotClass: 'bg-heading-teal',
    checkClass: 'text-white dark:text-black',
  },
  purple: {
    label: 'Purple',
    textClass: 'text-heading-purple',
    borderClass: 'border-heading-purple/30',
    dotClass: 'bg-heading-purple',
    checkClass: 'text-white dark:text-black',
  },
  amber: {
    label: 'Amber',
    textClass: 'text-heading-amber',
    borderClass: 'border-heading-amber/30',
    dotClass: 'bg-heading-amber',
    checkClass: 'text-white dark:text-black',
  },
  pink: {
    label: 'Pink',
    textClass: 'text-heading-pink',
    borderClass: 'border-heading-pink/30',
    dotClass: 'bg-heading-pink',
    checkClass: 'text-white dark:text-black',
  },
  green: {
    label: 'Green',
    textClass: 'text-heading-green',
    borderClass: 'border-heading-green/30',
    dotClass: 'bg-heading-green',
    checkClass: 'text-white dark:text-black',
  },
  red: {
    label: 'Red',
    textClass: 'text-heading-red',
    borderClass: 'border-heading-red/30',
    dotClass: 'bg-heading-red',
    checkClass: 'text-white dark:text-black',
  },
}

/** All heading colors in display order for the color picker */
export const headingColors: HeadingColor[] = [
  'default',
  'blue',
  'teal',
  'purple',
  'amber',
  'pink',
  'green',
  'red',
]
