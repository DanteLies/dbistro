import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'

function ChoiceButton({ label, active, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={[
        'flex h-14 w-full items-center justify-between rounded-2xl px-4 text-left font-semibold ring-1 transition-all duration-200',
        disabled ? 'opacity-60' : '',
        active
          ? 'bg-amber-500 text-white ring-amber-600/30 shadow-lg shadow-amber-500/20'
          : 'bg-white/95 text-neutral-900 ring-neutral-200 shadow-lg shadow-neutral-900/5 active:bg-neutral-50',
      ].join(' ')}
    >
      <span className="text-base">{label}</span>
      <span
        className={[
          'grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold',
          active ? 'bg-white/20' : 'bg-neutral-100 text-neutral-700',
        ].join(' ')}
      >
        {active ? '✓' : ''}
      </span>
    </motion.button>
  )
}

export default function Lunch() {
  const { session, activeLog, actions } = useAppStore()
  const [choice, setChoice] = useState('Pizza')
  const [custom, setCustom] = useState('')

  const email = session.email || 'zaposleni'
  const alreadyLogged = Boolean(activeLog.lunchLogs[email])

  const resolved = useMemo(() => {
    if (choice !== 'Drugo') return choice
    return custom.trim()
  }, [choice, custom])

  const entries = useMemo(() => {
    return Object.values(activeLog.lunchLogs || {}).sort((a, b) => {
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })
  }, [activeLog.lunchLogs])

  return (
    <PageLayout title="Malica">
      <Card className="p-4">
        <div className="text-sm font-semibold text-neutral-500">
          Kaj si jedel za malico?
        </div>
        {alreadyLogged ? (
          <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200">
            Malico si že vpisal/a za danes.
          </div>
        ) : null}
        <div className="mt-3 space-y-3">
          {['Pizza', 'Krompir', 'Tortica', 'Drugo'].map((v) => (
            <ChoiceButton
              key={v}
              label={v}
              active={choice === v}
              disabled={alreadyLogged}
              onClick={() => setChoice(v)}
            />
          ))}

          {choice === 'Drugo' ? (
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Vpiši malico…"
              disabled={alreadyLogged}
              className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          ) : null}

          <ActionButton
            disabled={!resolved || alreadyLogged}
            className={!resolved || alreadyLogged ? 'opacity-60 shadow-none' : ''}
            onClick={() => {
              if (!resolved || alreadyLogged) return
              actions.submitLunch({ email, item: resolved })
              setCustom('')
            }}
          >
            Shrani
          </ActionButton>
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
            entries.slice(0, 10).map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-neutral-900">
                      {e.item}
                    </div>
                    <div className="text-xs font-semibold text-neutral-500">
                      {e.email}
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
