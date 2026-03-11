import { motion } from 'framer-motion'

export default function ActionButton({
  children,
  className = '',
  variant = 'primary',
  ...props
}) {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-semibold shadow-lg shadow-neutral-900/10 ring-1 transition-all duration-200'

  const styles =
    variant === 'primary'
      ? 'bg-amber-500 text-white ring-amber-600/30 active:bg-amber-600'
      : variant === 'soft'
        ? 'bg-amber-50 text-neutral-900 ring-amber-200 active:bg-amber-100'
        : 'bg-white text-neutral-900 ring-neutral-200 active:bg-neutral-50'

  return (
    <motion.button
      {...props}
      type={props.type || 'button'}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={[base, styles, className].join(' ')}
    >
      {children}
    </motion.button>
  )
}

