import { motion } from 'framer-motion'

export default function CounterButton({
  label,
  count = 0,
  onClick,
  className = '',
  disabled = false,
}) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={[
        'relative flex w-full items-center justify-between rounded-2xl bg-white/95 px-4 py-4 text-left',
        'shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200 transition-all duration-200',
        disabled ? 'opacity-50 shadow-none' : 'active:bg-neutral-50',
        className,
      ].join(' ')}
    >
      <div className="text-lg font-semibold text-neutral-900">{label}</div>
      <div className="min-w-10 rounded-2xl bg-amber-500 px-3 py-1 text-center text-sm font-bold text-white shadow shadow-amber-500/30">
        {count}
      </div>
    </motion.button>
  )
}
