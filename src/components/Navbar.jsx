import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/appStore.jsx'

function NavButton({ label, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-white/95 text-sm font-semibold text-neutral-900 shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-200"
    >
      {label}
    </motion.button>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { session, actions } = useAppStore()

  if (!session.loggedIn) return null

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none fixed inset-x-0 bottom-3 z-50 mx-auto w-full max-w-md px-3"
    >
      <div className="pointer-events-auto grid grid-cols-2 gap-3">
        <NavButton label="🏠 Domov" onClick={() => navigate('/dashboard')} />
        <NavButton
          label="🚪 Odjava"
          onClick={async () => {
            await actions.logout()
            navigate('/login', { replace: true })
          }}
        />
      </div>
    </motion.div>
  )
}
