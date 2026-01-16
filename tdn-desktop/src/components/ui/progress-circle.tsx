import { cn } from '@/lib/utils'

/**
 * ProgressCircle - SVG circular progress indicator.
 *
 * Used in the sidebar (via ProjectStatusIndicator) to show project completion
 * percentage. Also used in ProjectCard. Renders as an SVG with two circles:
 * a faint background track and a colored progress arc.
 *
 * Color comes from currentColor (controlled via Tailwind text-* classes).
 * Animation is CSS transition on stroke-dashoffset.
 */
interface ProgressCircleProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressCircle({
  value,
  size = 16,
  strokeWidth = 2,
  className,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-20"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}
