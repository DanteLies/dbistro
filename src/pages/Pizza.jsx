import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import CounterButton from '../components/CounterButton.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'

function formatConfirmedMeta(confirmed) {
  if (!confirmed || typeof confirmed !== 'object') return ''
  const at = String(confirmed.at || '').trim()
  const by = String(confirmed.by || '').trim()
  const time = at
    ? new Date(at).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''
  const parts = [by, time].filter(Boolean)
  return parts.join(' • ')
}

function CountInput({ label, value, onChange, confirmed, onConfirm, onUnlock, canUnlock }) {
  const isConfirmed = Boolean(confirmed)
  const canConfirm = String(value || '').trim().length > 0
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-extrabold tracking-tight text-neutral-900">
          {label}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isConfirmed}
            inputMode="numeric"
            placeholder="0"
            className={[
              'h-12 w-28 rounded-2xl px-3 text-right text-base font-extrabold shadow-inner shadow-neutral-900/5 ring-1 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400',
              isConfirmed
                ? 'bg-neutral-100 text-neutral-600 ring-neutral-200'
                : 'bg-neutral-50 text-neutral-900 ring-neutral-200',
            ].join(' ')}
          />
          {!isConfirmed ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={!canConfirm}
              onClick={onConfirm}
              className={[
                'h-12 rounded-2xl bg-amber-500 px-3 text-xs font-extrabold text-white shadow-lg shadow-amber-500/25 ring-1 ring-amber-600/30',
                !canConfirm ? 'opacity-60 shadow-none' : '',
              ].join(' ')}
            >
              Potrdi
            </motion.button>
          ) : canUnlock ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onUnlock}
              className="h-12 rounded-2xl bg-white/95 px-3 text-xs font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-200"
            >
              Odkleni
            </motion.button>
          ) : (
            <div className="grid h-12 place-items-center rounded-2xl bg-neutral-900 px-3 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
              Potrjeno
            </div>
          )}
        </div>
      </div>
      {isConfirmed ? (
        <div className="mt-2 text-xs font-semibold text-neutral-500">
          {formatConfirmedMeta(confirmed) || 'Potrjeno'}
        </div>
      ) : null}
    </Card>
  )
}

export default function Pizza() {
  const { session, activeLog, actions } = useAppStore()
  const [showReset, setShowReset] = useState(false)
  const [discardQty, setDiscardQty] = useState('1')

  const remaining = activeLog.doughCount.remaining

  const salesTotal = useMemo(() => {
    return Object.values(activeLog.pizzaSales).reduce((sum, v) => sum + v, 0)
  }, [activeLog.pizzaSales])

  const canSell = remaining > 0

  return (
    <PageLayout title="Pizza">
      <Card className="p-4">
        <div className="text-sm font-semibold text-neutral-500">
          Preostale kroglice testa
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="text-4xl font-extrabold tracking-tight text-neutral-900">
            <motion.span
              key={remaining}
              initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              className="inline-block"
            >
              {remaining}
            </motion.span>
          </div>
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800 ring-1 ring-amber-200">
            Prodano: {salesTotal}
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {['Pepperoni', 'Morska', 'Klasika', 'Tuna'].map((t) => (
          <CounterButton
            key={t}
            label={t}
            count={activeLog.pizzaSales[t] || 0}
            disabled={!canSell}
            onClick={() => actions.sellPizza(t)}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ActionButton
          variant="soft"
          onClick={() => setShowReset(true)}
          className="py-4"
        >
          Nova runda testa
        </ActionButton>
        <div className="space-y-2">
          <input
            value={discardQty}
            onChange={(e) => setDiscardQty(e.target.value)}
            inputMode="numeric"
            placeholder="1"
            className="h-12 w-full rounded-2xl bg-neutral-50 px-3 text-center text-base font-extrabold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
          />
          <ActionButton
            variant="secondary"
            onClick={() => {
              const raw = String(discardQty || '').trim().replace(',', '.')
              const parsed = Number.parseFloat(raw)
              const qty = Number.isFinite(parsed) ? Math.round(parsed) : 0
              if (qty <= 0) return
              actions.discardDough({
                quantity: qty,
                note: qty === 1 ? 'Odpis: kroglica testa' : `Odpis: ${qty} kroglic testa`,
              })
              setDiscardQty('1')
            }}
            className="py-4"
          >
            Odpiši kroglice
          </ActionButton>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
          Vnosi (jutro / izmena / večer)
        </div>
        <div className="space-y-3">
          <CountInput
            label="Jutro"
            value={activeLog.doughCount.manual.morning}
            onChange={(v) => actions.setDoughManual('morning', v)}
            confirmed={activeLog.doughCount.manualConfirmed?.morning}
            onConfirm={() => actions.confirmDoughManual('morning')}
            onUnlock={() => actions.unconfirmDoughManual('morning')}
            canUnlock={session.isAdmin}
          />
          <CountInput
            label="Izmena"
            value={activeLog.doughCount.manual.shift}
            onChange={(v) => actions.setDoughManual('shift', v)}
            confirmed={activeLog.doughCount.manualConfirmed?.shift}
            onConfirm={() => actions.confirmDoughManual('shift')}
            onUnlock={() => actions.unconfirmDoughManual('shift')}
            canUnlock={session.isAdmin}
          />
          <CountInput
            label="Večer"
            value={activeLog.doughCount.manual.evening}
            onChange={(v) => actions.setDoughManual('evening', v)}
            confirmed={activeLog.doughCount.manualConfirmed?.evening}
            onConfirm={() => actions.confirmDoughManual('evening')}
            onUnlock={() => actions.unconfirmDoughManual('evening')}
            canUnlock={session.isAdmin}
          />
        </div>
      </div>

      <AnimatePresence>
        {showReset ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 px-3 pb-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="w-full max-w-md"
            >
              <Card className="p-5">
                <div className="text-lg font-extrabold tracking-tight text-neutral-900">
                  Nova runda testa
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-600">
                  To bo zavrglo preostanek in nastavilo na 54 kroglic.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ActionButton
                    variant="secondary"
                    onClick={() => setShowReset(false)}
                  >
                    Prekliči
                  </ActionButton>
                  <ActionButton
                    onClick={() => {
                      actions.newDoughBatch()
                      setShowReset(false)
                    }}
                  >
                    Potrdi
                  </ActionButton>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageLayout>
  )
}
