import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import CounterButton from '../components/CounterButton.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'
import Card from '../components/Card.jsx'

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

export default function Potato() {
  const { session, activeLog, derived, actions } = useAppStore()
  const [kg, setKg] = useState('')

  const canAdd = useMemo(() => {
    const n = Number(String(kg).trim().replace(',', '.'))
    return Number.isFinite(n) && n > 0
  }, [kg])

  const canSellPortion = derived.potatoRemainingKg >= 0.2

  return (
    <PageLayout title="Krompir">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-500">
                Nova peka
              </div>
              <div className="text-xl font-extrabold tracking-tight text-neutral-900">
                Kilogrami
              </div>
            </div>
            <motion.div
              key={derived.potatoTotalBakedKg}
              initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200"
            >
              Skupaj: {derived.potatoTotalBakedKg.toFixed(1)} kg
            </motion.div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              inputMode="decimal"
              placeholder="npr. 2"
              className="h-14 flex-1 rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
            <motion.button
              type="button"
              onClick={() => setKg('2')}
              whileTap={{ scale: 0.96 }}
              className="h-14 rounded-2xl bg-white/95 px-4 text-sm font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
            >
              2kg
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setKg('4')}
              whileTap={{ scale: 0.96 }}
              className="h-14 rounded-2xl bg-white/95 px-4 text-sm font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
            >
              4kg
            </motion.button>
          </div>

          <div className="mt-3">
            <ActionButton
              disabled={!canAdd}
              className={!canAdd ? 'opacity-60 shadow-none' : ''}
              onClick={() => {
                if (!canAdd) return
                actions.addPotatoBatch(kg)
                setKg('')
              }}
            >
              Dodaj peko
            </ActionButton>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-neutral-500">Kalkulator</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
              <div className="text-xs font-semibold text-neutral-500">
                Skupaj pečeno
              </div>
              <div className="text-lg font-extrabold text-neutral-900">
                {derived.potatoTotalBakedKg.toFixed(1)}kg
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
              <div className="text-xs font-semibold text-neutral-500">
                Prodane porcije
              </div>
              <div className="text-lg font-extrabold text-neutral-900">
                {derived.potatoSoldPortions}
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
              <div className="text-xs font-semibold text-neutral-500">
                Porabljeno (200g)
              </div>
              <div className="text-lg font-extrabold text-neutral-900">
                {derived.potatoConsumedKg.toFixed(1)}kg
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="text-xs font-semibold text-amber-800">
                Preostanek
              </div>
              <div className="text-lg font-extrabold text-amber-900">
                <motion.span
                  key={derived.potatoRemainingKg}
                  initial={{ scale: 0.96, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                  className="inline-block"
                >
                  {derived.potatoRemainingKg.toFixed(1)}kg
                </motion.span>
              </div>
            </div>
          </div>
        </Card>

        <div>
          <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
            Peke
          </div>
          <div className="space-y-3">
            {activeLog.potatoBatches.length === 0 ? (
              <Card className="p-4">
                <div className="text-sm font-semibold text-neutral-500">
                  Ni vpisov.
                </div>
              </Card>
            ) : (
              activeLog.potatoBatches.map((b, idx) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-extrabold text-neutral-900">
                      Peka {idx + 1}
                    </div>
                    <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
                      {Number(b.kg).toFixed(1)}kg
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
            Prodaja
          </div>
          <div className="space-y-3">
            {[
              { key: 'Pulled Beef', label: 'Cufana govedina' },
              { key: 'Pulled Pork', label: 'Cufana svinjina' },
              { key: 'Pulled Chicken', label: 'Cufan piščanec' },
              { key: 'Chilli con carne', label: 'Chilli con carne' },
              { key: 'Spicy Chilli', label: 'Pekoč chilli' },
            ].map((item) => (
              <CounterButton
                key={item.key}
                label={item.label}
                count={activeLog.potatoSales[item.key] || 0}
                disabled={!canSellPortion}
                onClick={() => actions.sellPotato(item.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
            Vnosi zaloge
          </div>
          <div className="space-y-3">
            <CountInput
              label="Jutro"
              value={activeLog.potatoManual.morning}
              onChange={(v) => actions.setPotatoManual('morning', v)}
              confirmed={activeLog.potatoManualConfirmed?.morning}
              onConfirm={() => actions.confirmPotatoManual('morning')}
              onUnlock={() => actions.unconfirmPotatoManual('morning')}
              canUnlock={session.isAdmin}
            />
            <CountInput
              label="Izmena"
              value={activeLog.potatoManual.shift}
              onChange={(v) => actions.setPotatoManual('shift', v)}
              confirmed={activeLog.potatoManualConfirmed?.shift}
              onConfirm={() => actions.confirmPotatoManual('shift')}
              onUnlock={() => actions.unconfirmPotatoManual('shift')}
              canUnlock={session.isAdmin}
            />
            <CountInput
              label="Večer"
              value={activeLog.potatoManual.evening}
              onChange={(v) => actions.setPotatoManual('evening', v)}
              confirmed={activeLog.potatoManualConfirmed?.evening}
              onConfirm={() => actions.confirmPotatoManual('evening')}
              onUnlock={() => actions.unconfirmPotatoManual('evening')}
              canUnlock={session.isAdmin}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
