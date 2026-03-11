import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/appStore.jsx'

export default function PageLayout({
  title,
  children,
  className = '',
  showBack = true,
  backTo = '/dashboard',
}) {
  const navigate = useNavigate()
  const { session, actions } = useAppStore()

  return (
    <div className="min-h-full bg-neutral-100">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <div className="sticky top-0 z-40 bg-neutral-100/80 px-3 pb-2 pt-3 backdrop-blur">
          <div className="flex items-center gap-2">
            {showBack ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (window.history.length > 1) return navigate(-1)
                  navigate(backTo, { replace: true })
                }}
                className="h-12 w-12 rounded-2xl bg-white/95 text-lg shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-200"
                aria-label="Nazaj"
              >
                ←
              </motion.button>
            ) : (
              <div className="h-12 w-12" />
            )}

            <div className="flex-1">
              <div className="text-sm font-semibold text-neutral-500">
                Kuhinjski dnevnik
              </div>
              <div className="text-xl font-extrabold tracking-tight text-neutral-900">
                {title}
              </div>
            </div>
            {session.loggedIn ? (
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/dashboard')}
                  className="h-12 rounded-2xl bg-white/95 px-4 text-sm font-semibold text-neutral-900 shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-200"
                  aria-label="Domov"
                >
                  Domov
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    await actions.logout()
                    navigate('/login', { replace: true })
                  }}
                  className="h-12 rounded-2xl bg-white/95 px-4 text-sm font-semibold text-neutral-900 shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-200"
                  aria-label="Odjava"
                >
                  Odjava
                </motion.button>
              </div>
            ) : (
              <div className="h-12 w-12" />
            )}
          </div>
        </div>

        <div className={['flex-1 px-3 pb-10 pt-2', className].join(' ')}>
          {children}
        </div>
      </div>
    </div>
  )
}
