import { motion } from 'framer-motion'
import { useMemo } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'

export default function Coffee() {
  const { session, activeLog, actions } = useAppStore()

  const entries = useMemo(() => {
    return (activeLog.coffeeLogs || []).slice(0, 15)
  }, [activeLog.coffeeLogs])

  return (
    <PageLayout title="Kava">
      <ActionButton onClick={() => actions.drinkCoffee({ email: session.email })}>
        ☕ Spil sem kavo
      </ActionButton>

      <Card className="mt-4 p-4">
        <div className="text-sm font-semibold text-neutral-500">
          Današnje kave
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-neutral-900">
          <motion.span
            key={activeLog.coffeeCount}
            initial={{ scale: 0.96, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="inline-block"
          >
            {activeLog.coffeeCount}
          </motion.span>
        </div>
      </Card>

      <div className="mt-4">
        <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
          Vpisi
        </div>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <Card className="p-4">
              <div className="text-sm font-semibold text-neutral-500">
                Ni vpisov.
              </div>
            </Card>
          ) : (
            entries.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-neutral-900">
                      Kava
                    </div>
                    <div className="text-xs font-semibold text-neutral-500">
                      {e.email || '—'}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    {new Date(e.createdAt).toLocaleString([], {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  )
}
