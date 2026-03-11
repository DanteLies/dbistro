import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'

function DashCard({ icon, label, onClick, accent = 'amber' }) {
  const accentClasses =
    accent === 'amber'
      ? 'bg-amber-50 ring-amber-200'
      : accent === 'rose'
        ? 'bg-rose-50 ring-rose-200'
        : 'bg-sky-50 ring-sky-200'

  return (
    <Card onClick={onClick} className="p-4 text-left">
      <div className="flex items-center gap-3">
        <div
          className={[
            'grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-inner shadow-neutral-900/5 ring-1',
            accentClasses,
          ].join(' ')}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-base font-extrabold tracking-tight text-neutral-900">
            {label}
          </div>
          <div className="text-xs font-semibold text-neutral-500">
            Tapni za odprtje
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { session, activeDateKey } = useAppStore()

  const cards = useMemo(() => {
    const base = [
      { icon: '🍕', label: 'Pizza', to: '/pizza', accent: 'amber' },
      { icon: '🥔', label: 'Krompir', to: '/potato', accent: 'sky' },
      { icon: '🍰', label: 'Tortice', to: '/cakes', accent: 'rose' },
      { icon: '☕', label: 'Kava', to: '/coffee', accent: 'amber' },
      { icon: '🍽', label: 'Malica', to: '/lunch', accent: 'sky' },
      { icon: '🗑', label: 'Odpis hrane', to: '/waste', accent: 'rose' },
      { icon: '📋', label: 'Odprti računi', to: '/dejan-orders', accent: 'amber' },
    ]
    if (session.isAdmin) {
      base.push({ icon: '📊', label: 'Admin', to: '/admin', accent: 'sky' })
    }
    return base
  }, [session.isAdmin])

  return (
    <PageLayout title="Domov" showBack={false}>
      <div className="relative">
        <div className="pointer-events-none absolute -inset-x-3 -top-8 h-48 rounded-b-[40px] bg-gradient-to-br from-amber-200/70 via-neutral-100 to-rose-200/60 blur-[1px]" />
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-500">
                    Prijavljen kot
                  </div>
                  <div className="text-base font-extrabold text-neutral-900">
                    {session.email || 'zaposleni'}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-neutral-500">
                    Dnevnik: {activeDateKey}
                  </div>
                </div>
                <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
                  {session.isAdmin ? 'ADMIN' : 'OSEBJE'}
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05, delayChildren: 0.05 },
              },
            }}
            className="mt-4 grid grid-cols-2 gap-3"
          >
            {cards.map((c) => (
              <motion.div
                key={c.to}
                variants={{
                  hidden: { opacity: 0, y: 12, filter: 'blur(8px)' },
                  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <DashCard
                  icon={c.icon}
                  label={c.label}
                  accent={c.accent}
                  onClick={() => navigate(c.to)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </PageLayout>
  )
}
