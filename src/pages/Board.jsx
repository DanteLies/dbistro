import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { useAppStore } from '../state/appStore.jsx'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'

function formatMeta(at, by) {
  const ts = String(at || '').trim()
  const who = String(by || '').trim()
  const time = ts
    ? new Date(ts).toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''
  return [who, time].filter(Boolean).join(' • ')
}

export default function Board() {
  const { session, activeDateKey, activeLog, actions } = useAppStore()
  const [draftAnnouncement, setDraftAnnouncement] = useState('')
  const [newTask, setNewTask] = useState('')

  const announcement = activeLog.announcement && typeof activeLog.announcement === 'object' ? activeLog.announcement : {}
  const tasks = Array.isArray(activeLog.tasks) ? activeLog.tasks : []

  useEffect(() => {
    setDraftAnnouncement(String(announcement.text || ''))
  }, [activeDateKey, announcement.text])

  const sortedTasks = useMemo(() => {
    const copy = tasks.slice()
    copy.sort((a, b) => {
      const ad = Boolean(a?.done)
      const bd = Boolean(b?.done)
      if (ad !== bd) return ad ? 1 : -1
      const at = a?.createdAt ? Date.parse(a.createdAt) : 0
      const bt = b?.createdAt ? Date.parse(b.createdAt) : 0
      return bt - at
    })
    return copy
  }, [tasks])

  const [chatError, setChatError] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    if (!session.loggedIn) return
    let cancelled = false
    setChatError('')
    setChatLoading(true)
    setChatMessages([])

    async function load() {
      const res = await supabase
        .from('chat_messages')
        .select('id,date_key,sender,message,created_at')
        .eq('date_key', activeDateKey)
        .order('created_at', { ascending: true })
        .limit(200)
      if (cancelled) return
      if (res.error) {
        setChatError(res.error.message || 'Napaka pri nalaganju chata.')
        setChatLoading(false)
        return
      }
      setChatMessages(Array.isArray(res.data) ? res.data : [])
      setChatLoading(false)
    }

    load().catch(() => {
      if (cancelled) return
      setChatError('Napaka pri nalaganju chata.')
      setChatLoading(false)
    })

    const channel = supabase
      .channel(`chat_messages:${activeDateKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `date_key=eq.${activeDateKey}` },
        (payload) => {
          const row = payload?.new
          if (!row || cancelled) return
          setChatMessages((prev) => {
            if (prev.some((m) => m && m.id === row.id)) return prev
            return [...prev, row]
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session.loggedIn, activeDateKey])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chatMessages.length])

  const chatReady = isSupabaseConfigured && supabase && session.loggedIn && !chatError

  return (
    <PageLayout title="Oglasna deska">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-500">Dnevnik</div>
          <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
            {activeDateKey}
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-extrabold tracking-tight text-neutral-900">Oglas</div>
              <div className="mt-1 text-xs font-semibold text-neutral-500">
                {announcement.at || announcement.by ? formatMeta(announcement.at, announcement.by) : 'Ni objave'}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800 ring-1 ring-amber-200">
              {session.isAdmin ? 'UREDNIŠKI' : 'BRANJE'}
            </div>
          </div>
          <textarea
            value={draftAnnouncement}
            onChange={(e) => setDraftAnnouncement(e.target.value)}
            disabled={!session.isAdmin}
            rows={4}
            placeholder="Kaj je danes treba narediti?"
            className={[
              'mt-3 w-full resize-none rounded-2xl px-3 py-3 text-sm font-semibold shadow-inner shadow-neutral-900/5 ring-1 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400',
              session.isAdmin
                ? 'bg-neutral-50 text-neutral-900 ring-neutral-200'
                : 'bg-neutral-100 text-neutral-600 ring-neutral-200',
            ].join(' ')}
          />
          {session.isAdmin ? (
            <div className="mt-3">
              <ActionButton
                onClick={() => actions.setAnnouncement(draftAnnouncement)}
                className="py-3 text-sm"
              >
                Shrani oglas
              </ActionButton>
            </div>
          ) : null}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-extrabold tracking-tight text-neutral-900">Naloge</div>
              <div className="mt-1 text-xs font-semibold text-neutral-500">
                {tasks.length ? `${tasks.filter((t) => t && t.done).length}/${tasks.length} opravljeno` : 'Ni nalog'}
              </div>
            </div>
          </div>

          {session.isAdmin ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Dodaj novo nalogo…"
                className="h-12 flex-1 rounded-2xl bg-neutral-50 px-3 text-sm font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none focus:ring-2 focus:ring-amber-400"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={!String(newTask || '').trim()}
                onClick={() => {
                  actions.addTask(newTask)
                  setNewTask('')
                }}
                className={[
                  'h-12 rounded-2xl bg-neutral-900 px-4 text-sm font-extrabold text-white shadow-lg shadow-neutral-900/20 ring-1 ring-neutral-900/10',
                  !String(newTask || '').trim() ? 'opacity-60 shadow-none' : '',
                ].join(' ')}
              >
                Dodaj
              </motion.button>
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            {sortedTasks.map((t) => (
              <div
                key={t.id}
                className={[
                  'flex items-center gap-3 rounded-2xl px-3 py-3 ring-1',
                  t.done ? 'bg-neutral-100 ring-neutral-200' : 'bg-neutral-50 ring-neutral-200',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={Boolean(t.done)}
                  onChange={() => actions.toggleTask(t.id)}
                  className="h-5 w-5"
                />
                <div className="min-w-0 flex-1">
                  <div className={['text-sm font-extrabold', t.done ? 'text-neutral-500 line-through' : 'text-neutral-900'].join(' ')}>
                    {t.text}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-neutral-500">
                    {t.done ? formatMeta(t.doneAt, t.doneBy) : formatMeta(t.createdAt, t.createdBy)}
                  </div>
                </div>
                {session.isAdmin ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => actions.deleteTask(t.id)}
                    className="rounded-2xl bg-white px-3 py-2 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200"
                  >
                    Briši
                  </motion.button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-extrabold tracking-tight text-neutral-900">Chat</div>
              <div className="mt-1 text-xs font-semibold text-neutral-500">
                {chatLoading ? 'Nalagam…' : 'Sporočila za ta dan'}
              </div>
            </div>
          </div>

          {!isSupabaseConfigured || !supabase ? (
            <div className="mt-3 text-sm font-semibold text-neutral-600">
              Supabase ni nastavljen, chat ni na voljo.
            </div>
          ) : chatError ? (
            <div className="mt-3 text-sm font-semibold text-rose-700">
              {chatError}
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="mt-3 h-64 w-full overflow-auto rounded-2xl bg-neutral-50 px-3 py-3 text-sm ring-1 ring-neutral-200"
              >
                {chatMessages.length === 0 ? (
                  <div className="text-sm font-semibold text-neutral-500">Ni sporočil.</div>
                ) : (
                  <div className="space-y-2">
                    {chatMessages.map((m) => (
                      <div key={m.id} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-neutral-200">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-extrabold text-neutral-900">
                            {String(m.sender || '').trim() || 'zaposleni'}
                          </div>
                          <div className="text-[11px] font-semibold text-neutral-500">
                            {m.created_at
                              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </div>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-900">
                          {String(m.message || '')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Napiši sporočilo…"
                  className="h-12 flex-1 rounded-2xl bg-neutral-50 px-3 text-sm font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none focus:ring-2 focus:ring-amber-400"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    if (e.shiftKey) return
                    e.preventDefault()
                    const text = String(chatText || '').trim()
                    if (!text) return
                    if (!chatReady) return
                    if (sending) return
                    setSending(true)
                    supabase
                      .from('chat_messages')
                      .insert({
                        date_key: activeDateKey,
                        sender: session.email || 'zaposleni',
                        sender_id: session.userId || null,
                        message: text,
                      })
                      .then(({ error }) => {
                        if (error) setChatError(error.message || 'Napaka pri pošiljanju.')
                        else setChatText('')
                      })
                      .finally(() => setSending(false))
                  }}
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  disabled={sending || !String(chatText || '').trim() || !chatReady}
                  onClick={() => {
                    const text = String(chatText || '').trim()
                    if (!text) return
                    if (!chatReady) return
                    if (sending) return
                    setSending(true)
                    supabase
                      .from('chat_messages')
                      .insert({
                        date_key: activeDateKey,
                        sender: session.email || 'zaposleni',
                        sender_id: session.userId || null,
                        message: text,
                      })
                      .then(({ error }) => {
                        if (error) setChatError(error.message || 'Napaka pri pošiljanju.')
                        else setChatText('')
                      })
                      .finally(() => setSending(false))
                  }}
                  className={[
                    'h-12 rounded-2xl bg-amber-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 ring-1 ring-amber-600/30',
                    sending || !String(chatText || '').trim() || !chatReady ? 'opacity-60 shadow-none' : '',
                  ].join(' ')}
                >
                  Pošlji
                </motion.button>
              </div>
            </>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}
