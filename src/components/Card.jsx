import { motion } from 'framer-motion'

export default function Card({
  children,
  className = '',
  onClick,
  as,
  ...props
}) {
  const Component = as || (onClick ? motion.button : motion.div)

  return (
    <Component
      {...props}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={[
        'w-full rounded-2xl bg-white/95 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200',
        'transition-all duration-200',
        onClick ? 'active:shadow-neutral-900/10' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Component>
  )
}

