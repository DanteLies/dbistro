import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'

function formatTime(ts) {
  const v = String(ts || '').trim()
  if (!v) return ''
  return new Date(v).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Feedback() {
  const { session } = useAppStore()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sentOk, setSentOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])

  const canUseSupabase = isSupabaseConfigured && supabase && session.loggedIn
  const trimmed = useMemo(() => String(text || '').trim(), [text])

  useEffect(() => {
    if (!canUseSupabase) return
    let cancelled = false
    setError('')
    setLoading(true)
    supabase
      .from('feedback_requests')
      .select('id, message, created_at')
      .eq('created_by', session.userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message || 'Napaka pri nalaganju.')
          setItems([])
          setLoading(false)
          return
        }
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Napaka pri nalaganju.')
        setItems([])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canUseSupabase, session.userId])

  return (
    <PageLayout title="Predlogi">
      <Card className="p-4">
        <div className="text-base font-extrabold tracking-tight text-neutral-900">
          Predlogi za izboljšave
        </div>
        <div className="mt-1 text-sm font-semibold text-neutral-500">
          Pošlji predlog Aleksu direktno iz aplikacije.
        </div>
      </Card>

      <Card className="mt-3 p-4">
        {!isSupabaseConfigured || !supabase ? (
          <div className="text-sm font-semibold text-neutral-600">
            Supabase ni nastavljen, predlogov ni mogoče pošiljati.
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setSentOk(false)
                setError('')
              }}
              rows={5}
              placeholder="Npr. 'Dodaj filter po zaposlenih v Admin', 'Na Pizza strani naj ostane gumb Potrdi na vrhu', …"
              className="w-full resize-none rounded-2xl bg-neutral-50 px-3 py-3 text-sm font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
            {error ? (
              <div className="mt-2 text-sm font-semibold text-rose-700">{error}</div>
            ) : null}
            {sentOk ? (
              <div className="mt-2 text-sm font-semibold text-emerald-700">
                Poslano. Hvala!
              </div>
            ) : null}
            <div className="mt-3">
              <ActionButton
                disabled={!trimmed || sending || !canUseSupabase}
                onClick={async () => {
                  const msg = String(text || '').trim()
                  if (!msg) return
                  if (!canUseSupabase) return
                  if (sending) return
                  setSending(true)
                  setError('')
                  setSentOk(false)
                  const res = await supabase.from('feedback_requests').insert({
                    created_by: session.userId,
                    created_by_display: session.email || '',
                    to_user: 'aleks',
                    message: msg,
                  })
                  if (res.error) {
                    setError(res.error.message || 'Napaka pri pošiljanju.')
                    setSending(false)
                    return
                  }
                  setText('')
                  setSentOk(true)
                  setItems((prev) => [
                    { id: crypto.randomUUID(), message: msg, created_at: new Date().toISOString() },
                    ...(prev || []),
                  ])
                  setSending(false)
                }}
              >
                Pošlji Aleksu
              </ActionButton>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Moji zadnji predlogi
            </div>
            <div className="mt-1 text-xs font-semibold text-neutral-500">
              {loading ? 'Nalagam…' : 'Zadnjih 20'}
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setLoading(true)
              setError('')
              setSentOk(false)
              if (!canUseSupabase) {
                setLoading(false)
                return
              }
              supabase
                .from('feedback_requests')
                .select('id, message, created_at')
                .eq('created_by', session.userId)
                .order('created_at', { ascending: false })
                .limit(20)
                .then(({ data, error }) => {
                  if (error) {
                    setError(error.message || 'Napaka pri nalaganju.')
                    setItems([])
                    setLoading(false)
                    return
                  }
                  setItems(Array.isArray(data) ? data : [])
                  setLoading(false)
                })
                .catch(() => {
                  setError('Napaka pri nalaganju.')
                  setItems([])
                  setLoading(false)
                })
            }}
            className="h-10 rounded-2xl bg-white/95 px-4 text-xs font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
          >
            Osveži
          </motion.button>
        </div>

        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-sm font-semibold text-neutral-500">Ni poslanih predlogov.</div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl bg-neutral-50 px-3 py-3 ring-1 ring-neutral-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-neutral-500">
                    {formatTime(it.created_at)}
                  </div>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm font-semibold text-neutral-900">
                  {String(it.message || '')}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </PageLayout>
  )
}

