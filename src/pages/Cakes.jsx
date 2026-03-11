import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card.jsx'
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

function SmallButton({ label, onClick, tone = 'neutral', disabled = false }) {
  const styles =
    tone === 'plus'
      ? 'bg-amber-500 text-white ring-amber-600/30 active:bg-amber-600'
      : tone === 'minus'
        ? 'bg-neutral-900 text-white ring-neutral-900/30 active:bg-neutral-800'
        : 'bg-white text-neutral-900 ring-neutral-200 active:bg-neutral-50'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      className={[
        'flex h-12 w-full items-center justify-center rounded-2xl px-3 text-sm font-extrabold shadow-lg shadow-neutral-900/10 ring-1 transition-all duration-200',
        disabled ? 'opacity-60 shadow-none' : '',
        styles,
      ].join(' ')}
    >
      {label}
    </motion.button>
  )
}

export default function Cakes() {
  const { session, activeLog, actions } = useAppStore()
  const items = useMemo(() => {
    return [
      'Skutni retaš',
      'Cheesecake',
      'Korenčkova torta',
      'Mango torta',
      'Panacotta',
      'Rogljički',
    ]
  }, [])

  const [draftByName, setDraftByName] = useState(() => {
    return items.reduce((acc, n) => {
      acc[n] = String(activeLog.cakeInventory[n] ?? 0)
      return acc
    }, {})
  })

  useEffect(() => {
    setDraftByName((prev) => {
      const next = { ...prev }
      for (const n of items) next[n] = String(activeLog.cakeInventory[n] ?? 0)
      return next
    })
  }, [activeLog.cakeInventory, items])

  return (
    <PageLayout title="Tortice">
      <div>
        <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
          Dnevni vnosi
        </div>
        <div className="space-y-3">
          <CountInput
            label="Jutro"
            value={activeLog.cakeManual.morning}
            onChange={(v) => actions.setCakeManual('morning', v)}
            confirmed={activeLog.cakeManualConfirmed?.morning}
            onConfirm={() => actions.confirmCakeManual('morning')}
            onUnlock={() => actions.unconfirmCakeManual('morning')}
            canUnlock={session.isAdmin}
          />
          <CountInput
            label="Izmena"
            value={activeLog.cakeManual.shift}
            onChange={(v) => actions.setCakeManual('shift', v)}
            confirmed={activeLog.cakeManualConfirmed?.shift}
            onConfirm={() => actions.confirmCakeManual('shift')}
            onUnlock={() => actions.unconfirmCakeManual('shift')}
            canUnlock={session.isAdmin}
          />
          <CountInput
            label="Večer"
            value={activeLog.cakeManual.evening}
            onChange={(v) => actions.setCakeManual('evening', v)}
            confirmed={activeLog.cakeManualConfirmed?.evening}
            onConfirm={() => actions.confirmCakeManual('evening')}
            onUnlock={() => actions.unconfirmCakeManual('evening')}
            canUnlock={session.isAdmin}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-extrabold tracking-tight text-neutral-900">
          Vitrina
        </div>
        <div className="space-y-3">
          {items.map((name) => (
            <Card key={name} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-base font-extrabold tracking-tight text-neutral-900">
                    {name}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm font-semibold text-neutral-500">
                      V vitrini
                    </div>
                    <input
                      value={draftByName[name] ?? '0'}
                      onChange={(e) => {
                        const v = e.target.value
                        setDraftByName((prev) => ({ ...prev, [name]: v }))
                      }}
                      onBlur={() => {
                        actions.setCakeInventory(name, draftByName[name])
                      }}
                      inputMode="numeric"
                      className="h-10 w-24 rounded-2xl bg-neutral-50 px-3 text-right text-sm font-extrabold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-neutral-500">
                    Prodano danes: {activeLog.cakeSold[name] || 0}
                  </div>
                </div>

                <div className="grid w-28 gap-2">
                  <SmallButton
                    label="Prodaj"
                    tone="minus"
                    disabled={(activeLog.cakeInventory[name] || 0) <= 0}
                    onClick={() => actions.sellCake(name, 1)}
                  />
                  <SmallButton
                    label="Dodaj"
                    tone="plus"
                    onClick={() => actions.addCake(name, 1)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
