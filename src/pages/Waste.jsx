import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { useAppStore } from '../state/appStore.jsx'

function SegButton({ label, active, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={[
        'h-12 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition-all duration-200',
        active
          ? 'bg-amber-500 text-white ring-amber-600/30 shadow-lg shadow-amber-500/20'
          : 'bg-white/95 text-neutral-900 ring-neutral-200 shadow-lg shadow-neutral-900/5 active:bg-neutral-50',
      ].join(' ')}
    >
      {label}
    </motion.button>
  )
}

export default function Waste() {
  const { session, activeDateKey, activeLog, derived, actions } = useAppStore()
  const [category, setCategory] = useState('Potatoes')
  const [cakeType, setCakeType] = useState('')
  const [customItem, setCustomItem] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageSrcByPath, setImageSrcByPath] = useState({})
  const [visibleCount, setVisibleCount] = useState(8)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    setVisibleCount(8)
  }, [activeDateKey])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const entries = Array.isArray(activeLog.wasteLogs)
      ? activeLog.wasteLogs.slice(0, visibleCount)
      : []
    const missing = entries.map((e) => String(e?.imagePath || '').trim()).filter(Boolean)
    if (missing.length === 0) return

    let cancelled = false
    Promise.all(missing.map(async (path) => {
      const res = await supabase.storage.from('waste-images').createSignedUrl(path, 60 * 60)
      return { path, url: res?.data?.signedUrl || '' }
    }))
      .then((rows) => {
        if (cancelled) return
        setImageSrcByPath((prev) => {
          const next = { ...prev }
          rows.forEach((r) => {
            if (r.path && r.url && !next[r.path]) next[r.path] = r.url
          })
          return next
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [activeLog.wasteLogs, visibleCount])

  const canSubmit = useMemo(() => {
    if (quantity.trim().length === 0) return false
    if (category === 'Custom') return customItem.trim().length > 0
    if (category === 'Cake') return cakeType.trim().length > 0
    return true
  }, [category, cakeType, customItem, quantity])

  const unit = useMemo(() => {
    if (category === 'Dough') return 'kroglic'
    if (category === 'Potatoes') return 'kg'
    if (category === 'Cake') return 'kos'
    return ''
  }, [category])

  const dateValue = String(activeDateKey || '').trim()

  return (
    <PageLayout title="Odpis hrane">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-500">
            Odpis
          </div>
          <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
            {category === 'Dough'
              ? `${activeLog.doughCount.remaining} kroglic`
              : category === 'Potatoes'
                ? `${derived.potatoRemainingKg.toFixed(1)}kg`
                : ' '}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <SegButton
              label="Krompir"
              active={category === 'Potatoes'}
              onClick={() => setCategory('Potatoes')}
            />
            <SegButton
              label="Testo"
              active={category === 'Dough'}
              onClick={() => setCategory('Dough')}
            />
            <SegButton
              label="Tortice"
              active={category === 'Cake'}
              onClick={() => setCategory('Cake')}
            />
            <SegButton
              label="Po meri"
              active={category === 'Custom'}
              onClick={() => setCategory('Custom')}
            />
          </div>

          {category === 'Custom' ? (
            <label className="block">
              <div className="mb-1 text-sm font-semibold text-neutral-700">
                Vnos
              </div>
              <input
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                placeholder="npr. Juha"
                className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
              />
            </label>
          ) : null}

          {category === 'Cake' ? (
            <label className="block">
              <div className="mb-1 text-sm font-semibold text-neutral-700">
                Vrsta tortice
              </div>
              <select
                value={cakeType}
                onChange={(e) => setCakeType(e.target.value)}
                className="h-14 w-full rounded-2xl bg-white/95 px-4 text-base font-semibold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Izberi…</option>
                {[
                  'Skutni retaš',
                  'Cheesecake',
                  'Korenčkova torta',
                  'Mango torta',
                  'Panacotta',
                  'Rogljički',
                ].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <div className="mb-1 text-sm font-semibold text-neutral-700">
              Količina
            </div>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              placeholder={
                category === 'Dough'
                  ? 'npr. 1'
                  : category === 'Potatoes'
                    ? 'npr. 0,5'
                    : category === 'Cake'
                      ? 'npr. 2'
                      : 'npr. 1'
              }
              className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
            <div className="mt-1 text-xs font-semibold text-neutral-500">
              Enota: {unit || '—'}
            </div>
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-semibold text-neutral-700">
              Opomba (neobvezno)
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kratka opomba…"
              className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <div>
            <div className="mb-2 text-sm font-semibold text-neutral-700">
              Slika (neobvezno)
            </div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  if (!file) return
                  setError('')
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  setImageFile(file)
                  setPreviewUrl(URL.createObjectURL(file))
                }}
              />
              <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-white/95 text-base font-semibold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200 transition-all duration-200 active:bg-neutral-50">
                Naloži sliko
              </div>
            </label>
          </div>

          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-200">
              <img
                src={previewUrl}
                alt="Predogled slike"
                className="h-48 w-full object-cover"
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <ActionButton
            disabled={!canSubmit || saving}
            className={!canSubmit || saving ? 'opacity-60 shadow-none' : ''}
            onClick={async () => {
              if (!canSubmit) return
              setSaving(true)
              setError('')
              let imagePath = ''
              if (imageFile) {
                if (!isSupabaseConfigured || !supabase || !session.userId) {
                  setSaving(false)
                  setError('Slike so na voljo samo z nastavljeno prijavo.')
                  return
                }
                const fileExt =
                  (String(imageFile.name || '').split('.').pop() || '').trim().toLowerCase() ||
                  (String(imageFile.type || '').split('/').pop() || '').trim().toLowerCase() ||
                  'jpg'
                imagePath = `${activeDateKey}/${session.userId}/${crypto.randomUUID()}.${fileExt}`
                const uploadRes = await supabase.storage
                  .from('waste-images')
                  .upload(imagePath, imageFile, { contentType: imageFile.type || undefined })
                if (uploadRes.error) {
                  setSaving(false)
                  setError(uploadRes.error.message || 'Napaka pri nalaganju slike.')
                  return
                }
              }
              actions.addWaste({
                id: crypto.randomUUID(),
                email: session.email || '',
                category,
                quantity: quantity.trim(),
                unit,
                note: note.trim(),
                imagePath,
                cakeType,
                customItem: customItem.trim(),
                createdAt: new Date().toISOString(),
              })
              setCustomItem('')
              setQuantity('')
              setNote('')
              setImageFile(null)
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setPreviewUrl('')
              setSaving(false)
            }}
          >
            {saving ? 'Shranjujem…' : 'Shrani'}
          </ActionButton>
        </div>
      </Card>

      <div className="mt-4">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="text-sm font-extrabold tracking-tight text-neutral-900">
            Vpisi
          </div>
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-neutral-500">
              Dan
            </div>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => actions.setActiveDay(e.target.value)}
              className="h-10 rounded-2xl bg-white/95 px-3 text-sm font-semibold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
            />
          </label>
        </div>
        <div className="space-y-3">
          {activeLog.wasteLogs.length === 0 ? (
            <Card className="p-4">
              <div className="text-sm font-semibold text-neutral-500">
                Ni vpisov.
              </div>
            </Card>
          ) : (
            activeLog.wasteLogs.slice(0, visibleCount).map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-neutral-900">
                      {r.category === 'Potatoes'
                        ? 'Krompir'
                        : r.category === 'Dough'
                          ? 'Testo'
                          : r.category === 'Cake'
                            ? 'Tortice'
                            : 'Po meri'}
                    </div>
                    <div className="text-sm font-semibold text-neutral-500">
                      {r.quantity} {r.unit || ''}
                    </div>
                    {r.email ? (
                      <div className="text-xs font-semibold text-neutral-500">
                        {r.email}
                      </div>
                    ) : null}
                    {r.customItem ? (
                      <div className="text-xs font-semibold text-neutral-500">
                        {r.customItem}
                      </div>
                    ) : null}
                    {r.cakeType ? (
                      <div className="text-xs font-semibold text-neutral-500">
                        {r.cakeType}
                      </div>
                    ) : null}
                    {r.note ? (
                      <div className="mt-2 rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                        {r.note}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    {new Date(r.createdAt).toLocaleString([], {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {r.imageUrl ? (
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                    <img
                      src={r.imageUrl}
                      alt="Slika"
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ) : null}
                {!r.imageUrl && r.imagePath && imageSrcByPath[r.imagePath] ? (
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                    <img
                      src={imageSrcByPath[r.imagePath]}
                      alt="Slika"
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
        {activeLog.wasteLogs.length > visibleCount ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 20)}
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
