import { useEffect, useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'

export default function DejanOrders() {
  const { activeDateKey, activeLog, actions, session } = useAppStore()
  const [guestName, setGuestName] = useState('')
  const [time, setTime] = useState('')
  const [items, setItems] = useState('')
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    setVisibleCount(10)
  }, [activeDateKey])

  const canSubmit = useMemo(() => {
    return guestName.trim().length > 0 && items.trim().length > 0
  }, [guestName, items])

  return (
    <PageLayout title="Odprti računi">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-500">Nov vpis</div>
          <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
            {activeDateKey}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="mb-1 text-sm font-semibold text-neutral-700">
              Gost
            </div>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="npr. Marko"
              className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-semibold text-neutral-700">
              Ura
            </div>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="npr. 18:30"
              className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-semibold text-neutral-700">
              Naročilo
            </div>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="npr.\n2x špricer\n1x pizza klasik"
              rows={4}
              className="w-full resize-none rounded-2xl bg-neutral-50 px-4 py-3 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <ActionButton
            disabled={!canSubmit}
            className={!canSubmit ? 'opacity-60 shadow-none' : ''}
            onClick={() => {
              if (!canSubmit) return
              actions.addBoardOrder({
                id: crypto.randomUUID(),
                email: session.email || '',
                guestName: guestName.trim(),
                time: time.trim(),
                items: items.trim(),
                createdAt: new Date().toISOString(),
              })
              setGuestName('')
              setTime('')
              setItems('')
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
          {activeLog.boardOrders.length === 0 ? (
            <Card className="p-4">
              <div className="text-sm font-semibold text-neutral-500">
                Ni vpisov.
              </div>
            </Card>
          ) : (
            activeLog.boardOrders.slice(0, visibleCount).map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-neutral-900">
                      {o.guestName}
                    </div>
                    <div className="text-sm font-semibold text-neutral-500">
                      {o.time || '—'}
                    </div>
                    {o.email ? (
                      <div className="text-xs font-semibold text-neutral-500">{o.email}</div>
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    {new Date(o.createdAt).toLocaleString([], {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 ring-1 ring-neutral-200">
                  {o.items}
                </div>
              </Card>
            ))
          )}
        </div>
        {activeLog.boardOrders.length > visibleCount ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 10)}
              className="h-10 rounded-2xl bg-white/95 px-4 text-xs font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
            >
              Prikaži več vpisov
            </button>
          </div>
        ) : null}
      </div>
    </PageLayout>
  )
}
