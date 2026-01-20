import { Link } from 'react-router-dom'
import { forwardRef } from 'react'

export type BentoSize = 'sm' | 'md' | 'lg' | 'xl'

interface BentoCardBaseProps {
  size?: BentoSize
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

interface BentoCardDivProps extends BentoCardBaseProps {
  as?: 'div'
  onClick?: () => void
}

interface BentoCardLinkProps extends BentoCardBaseProps {
  as: 'link'
  to: string
  state?: unknown
}

interface BentoCardButtonProps extends BentoCardBaseProps {
  as: 'button'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}

export type BentoCardProps = BentoCardDivProps | BentoCardLinkProps | BentoCardButtonProps

const sizeClasses: Record<BentoSize, string> = {
  sm: '',
  md: 'col-span-2',
  lg: 'row-span-2',
  xl: 'col-span-2 row-span-2',
}

const baseClasses = `
  bento-card
  rounded-[var(--bento-radius)]
  p-[var(--bento-padding)]
  bg-dark-900/70
  border border-dark-700/40
  transition-all duration-300 ease-smooth
`

const hoverClasses = `
  cursor-pointer
  hover:bg-dark-800/60
  hover:border-dark-600/50
  hover:shadow-lg
  hover:scale-[1.01]
  active:scale-[0.99]
`

const glowClasses = `
  hover:shadow-glow
  hover:border-accent-500/30
`

export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>((props, ref) => {
  const { 
    size = 'sm', 
    children, 
    className = '', 
    hover = false,
    glow = false,
  } = props

  const classes = [
    baseClasses,
    sizeClasses[size],
    hover && hoverClasses,
    glow && glowClasses,
    className,
  ].filter(Boolean).join(' ')

  if (props.as === 'link') {
    const { to, state } = props as BentoCardLinkProps
    return (
      <Link to={to} state={state} className={classes}>
        {children}
      </Link>
    )
  }

  if (props.as === 'button') {
    const { onClick, disabled, type = 'button' } = props as BentoCardButtonProps
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={classes}
      >
        {children}
      </button>
    )
  }

  const { onClick } = props as BentoCardDivProps
  return (
    <div ref={ref} onClick={onClick} className={classes}>
      {children}
    </div>
  )
})

BentoCard.displayName = 'BentoCard'

export default BentoCard
