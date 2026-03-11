import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import Card from '../components/Card.jsx'
import PageLayout from '../components/PageLayout.jsx'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { useAppStore } from '../state/appStore.jsx'

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function sanitizeFileName(value) {
  return String(value || '')
    .trim()
    .replaceAll(':', '-')
    .replaceAll('/', '-')
    .replaceAll('\\', '-')
    .replaceAll(' ', '_')
}

function dataUrlInfo(dataUrl) {
  const s = String(dataUrl || '')
  if (!s.startsWith('data:')) return null
  const commaIdx = s.indexOf(',')
  if (commaIdx < 0) return null
  const meta = s.slice(5, commaIdx)
  const base64 = s.slice(commaIdx + 1)
  const mime = meta.split(';')[0] || 'application/octet-stream'
  return { mime, base64 }
}

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase()
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  if (m.includes('gif')) return 'gif'
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  return 'bin'
}

function extFromPath(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim()
  if (!raw) return ''
  const noHash = raw.split('#')[0] || ''
  const noQuery = noHash.split('?')[0] || ''
  const tail = noQuery.split('/').pop() || ''
  const dotIdx = tail.lastIndexOf('.')
  if (dotIdx < 0) return ''
  return String(tail.slice(dotIdx + 1)).toLowerCase()
}

function toExcelImageExtension(ext) {
  const e = String(ext || '').toLowerCase()
  if (e === 'jpg' || e === 'jpeg') return 'jpeg'
  if (e === 'png') return 'png'
  if (e === 'gif') return 'gif'
  return null
}

function base64ToBytes(base64) {
  const raw = atob(String(base64 || '').trim())
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function fmtCountConfirm(confirmed) {
  if (!confirmed || typeof confirmed !== 'object') return { value: '', by: '', at: '' }
  return {
    value: String(confirmed.value ?? ''),
    by: String(confirmed.by ?? ''),
    at: String(confirmed.at ?? ''),
  }
}

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

export default function Admin() {
  const { activeDateKey, activeLog, actions } = useAppStore()
  const [view, setView] = useState('Kave in malice')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [imageSrcByPath, setImageSrcByPath] = useState({})
  const [wasteVisible, setWasteVisible] = useState(10)
  const [boardVisible, setBoardVisible] = useState(10)

  const pizzasTotal = useMemo(() => {
    return Object.values(activeLog.pizzaSales).reduce((sum, v) => sum + v, 0)
  }, [activeLog.pizzaSales])

  const lunchEntries = useMemo(() => {
    return Object.values(activeLog.lunchLogs || {}).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    )
  }, [activeLog.lunchLogs])

  const coffeeEntries = useMemo(() => {
    return (activeLog.coffeeLogs || []).slice()
  }, [activeLog.coffeeLogs])

  const boardEntries = useMemo(() => {
    return (activeLog.boardOrders || []).slice()
  }, [activeLog.boardOrders])

  const wasteEntries = useMemo(() => {
    return (activeLog.wasteLogs || [])
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  }, [activeLog.wasteLogs])

  const employees = useMemo(() => {
    const set = new Set()
    lunchEntries.forEach((e) => {
      if (e && e.email) set.add(String(e.email).trim())
    })
    coffeeEntries.forEach((e) => {
      if (e && e.email) set.add(String(e.email).trim())
    })
    wasteEntries.forEach((e) => {
      if (e && e.email) set.add(String(e.email).trim())
    })
    boardEntries.forEach((e) => {
      if (e && e.email) set.add(String(e.email).trim())
    })
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [lunchEntries, coffeeEntries, wasteEntries, boardEntries])

  const filteredLunchEntries = useMemo(() => {
    if (!employeeFilter) return lunchEntries
    return lunchEntries.filter((e) => String(e.email || '').trim() === employeeFilter)
  }, [lunchEntries, employeeFilter])

  const filteredCoffeeEntries = useMemo(() => {
    if (!employeeFilter) return coffeeEntries
    return coffeeEntries.filter((e) => String(e.email || '').trim() === employeeFilter)
  }, [coffeeEntries, employeeFilter])

  const filteredWasteEntries = useMemo(() => {
    if (!employeeFilter) return wasteEntries
    return wasteEntries.filter((e) => String(e.email || '').trim() === employeeFilter)
  }, [wasteEntries, employeeFilter])

  const filteredBoardEntries = useMemo(() => {
    if (!employeeFilter) return boardEntries
    return boardEntries.filter((e) => String(e.email || '').trim() === employeeFilter)
  }, [boardEntries, employeeFilter])

  useEffect(() => {
    setWasteVisible(10)
    setBoardVisible(10)
  }, [activeDateKey, employeeFilter, view])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const paths = filteredWasteEntries
      .slice(0, wasteVisible)
      .map((e) => String(e?.imagePath || '').trim())
      .filter(Boolean)
    if (paths.length === 0) return

    let cancelled = false
    Promise.all(
      paths.map(async (path) => {
        const res = await supabase.storage.from('waste-images').createSignedUrl(path, 60 * 60)
        return { path, url: res?.data?.signedUrl || '' }
      }),
    )
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
  }, [filteredWasteEntries, wasteVisible])

  const salesPizza = useMemo(() => {
    return Object.entries(activeLog.pizzaSales || {})
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count)
  }, [activeLog.pizzaSales])

  const salesPotato = useMemo(() => {
    return Object.entries(activeLog.potatoSales || {})
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count)
  }, [activeLog.potatoSales])

  const salesCake = useMemo(() => {
    return Object.entries(activeLog.cakeSold || {})
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count)
  }, [activeLog.cakeSold])

  async function exportExcel() {
    const wb = new ExcelJS.Workbook()
    wb.created = new Date()
    const fileSafeDate = sanitizeFileName(activeDateKey)
    const fileSafeEmployee = employeeFilter ? sanitizeFileName(employeeFilter) : 'vsi'

    const addHeader = (ws, rowNumber) => {
      const row = ws.getRow(rowNumber)
      row.font = { bold: true }
      row.alignment = { vertical: 'middle' }
    }

    const summary = wb.addWorksheet('Povzetek')
    summary.columns = [
      { header: 'Polje', key: 'k', width: 26 },
      { header: 'Vrednost', key: 'v', width: 44 },
    ]
    addHeader(summary, 1)
    summary.addRow({ k: 'Datum', v: activeDateKey })
    summary.addRow({ k: 'Filter zaposleni', v: employeeFilter || 'Vsi' })
    summary.addRow({ k: '', v: '' })
    summary.addRow({ k: 'Pice (skupaj)', v: pizzasTotal })
    summary.addRow({ k: 'Kave (skupaj)', v: activeLog.coffeeCount })
    summary.addRow({ k: 'Odpisi (skupaj)', v: activeLog.wasteLogs.length })
    summary.addRow({ k: 'Odprti računi (skupaj)', v: activeLog.boardOrders.length })

    const stateSheet = wb.addWorksheet('Stanje')
    stateSheet.columns = [
      { header: 'Polje', key: 'k', width: 26 },
      { header: 'Vrednost', key: 'v', width: 44 },
    ]
    addHeader(stateSheet, 1)
    stateSheet.addRow({ k: 'Testo preostanek (kroglic)', v: activeLog.doughCount?.remaining ?? '' })
    stateSheet.addRow({ k: 'Krompir odpis (kg)', v: activeLog.potatoWasteKg ?? '' })
    stateSheet.addRow({ k: 'Krompir peke (št.)', v: (activeLog.potatoBatches || []).length })

    const manual = wb.addWorksheet('Količine')
    manual.columns = [
      { header: 'Skupina', key: 'group', width: 14 },
      { header: 'Termin', key: 'slot', width: 10 },
      { header: 'Vrednost', key: 'value', width: 12 },
      { header: 'Potrjeno (vrednost)', key: 'c_value', width: 18 },
      { header: 'Potrjeno (kdo)', key: 'c_by', width: 22 },
      { header: 'Potrjeno (čas)', key: 'c_at', width: 20 },
    ]
    addHeader(manual, 1)
    const dough = activeLog.doughCount?.manual || { morning: '', shift: '', evening: '' }
    const doughC = activeLog.doughCount?.manualConfirmed || {}
    const potato = activeLog.potatoManual || { morning: '', shift: '', evening: '' }
    const potatoC = activeLog.potatoManualConfirmed || {}
    const cake = activeLog.cakeManual || { morning: '', shift: '', evening: '' }
    const cakeC = activeLog.cakeManualConfirmed || {}
    ;[
      { group: 'Testo', slot: 'Zjutraj', key: 'morning', v: dough.morning, c: doughC.morning },
      { group: 'Testo', slot: 'Smena', key: 'shift', v: dough.shift, c: doughC.shift },
      { group: 'Testo', slot: 'Zvečer', key: 'evening', v: dough.evening, c: doughC.evening },
      { group: 'Krompir', slot: 'Zjutraj', key: 'morning', v: potato.morning, c: potatoC.morning },
      { group: 'Krompir', slot: 'Smena', key: 'shift', v: potato.shift, c: potatoC.shift },
      { group: 'Krompir', slot: 'Zvečer', key: 'evening', v: potato.evening, c: potatoC.evening },
      { group: 'Tortice', slot: 'Zjutraj', key: 'morning', v: cake.morning, c: cakeC.morning },
      { group: 'Tortice', slot: 'Smena', key: 'shift', v: cake.shift, c: cakeC.shift },
      { group: 'Tortice', slot: 'Zvečer', key: 'evening', v: cake.evening, c: cakeC.evening },
    ].forEach((r) => {
      const meta = fmtCountConfirm(r.c)
      manual.addRow({
        group: r.group,
        slot: r.slot,
        value: String(r.v ?? ''),
        c_value: meta.value,
        c_by: meta.by,
        c_at: meta.at,
      })
    })

    const lunchSheet = wb.addWorksheet('Malice')
    lunchSheet.columns = [
      { header: 'Čas', key: 'createdAt', width: 20 },
      { header: 'Zaposleni', key: 'email', width: 28 },
      { header: 'Malica', key: 'item', width: 20 },
    ]
    addHeader(lunchSheet, 1)
    filteredLunchEntries.forEach((e) => {
      lunchSheet.addRow({
        createdAt: e.createdAt || '',
        email: e.email || '',
        item: e.item || '',
      })
    })

    const coffeeSheet = wb.addWorksheet('Kave')
    coffeeSheet.columns = [
      { header: 'Čas', key: 'createdAt', width: 20 },
      { header: 'Zaposleni', key: 'email', width: 28 },
    ]
    addHeader(coffeeSheet, 1)
    filteredCoffeeEntries.forEach((e) => {
      coffeeSheet.addRow({ createdAt: e.createdAt || '', email: e.email || '' })
    })

    const wasteSheet = wb.addWorksheet('Odpisi')
    wasteSheet.columns = [
      { header: 'Čas', key: 'createdAt', width: 20 },
      { header: 'Zaposleni', key: 'email', width: 28 },
      { header: 'Kategorija', key: 'category', width: 12 },
      { header: 'Količina', key: 'quantity', width: 10 },
      { header: 'Enota', key: 'unit', width: 8 },
      { header: 'Izdelek', key: 'customItem', width: 20 },
      { header: 'Tortica', key: 'cakeType', width: 18 },
      { header: 'Opomba', key: 'note', width: 32 },
      { header: 'Slika', key: 'image', width: 18 },
      { header: 'ImageUrl', key: 'imageUrl', width: 40 },
      { header: 'ImagePath', key: 'imagePath', width: 40 },
      { header: 'ID', key: 'id', width: 36 },
    ]
    addHeader(wasteSheet, 1)

    for (const r of filteredWasteEntries) {
      const rowNumber = wasteSheet.rowCount + 1
      wasteSheet.addRow({
        createdAt: r.createdAt || '',
        email: r.email || '',
        category: r.category || '',
        quantity: r.quantity ?? '',
        unit: r.unit || '',
        customItem: r.customItem || '',
        cakeType: r.cakeType || '',
        note: r.note || '',
        image: '',
        imageUrl: r.imageUrl || '',
        imagePath: r.imagePath || '',
        id: r.id || '',
      })

      const imgCell = wasteSheet.getCell(rowNumber, 9)
      const hasImage = Boolean(r.imageUrl || r.imagePath)
      if (!hasImage) continue

      let bytes = null
      let ext = null

      if (r.imageUrl) {
        const info = dataUrlInfo(r.imageUrl)
        if (info) {
          const inferredExt = extFromMime(info.mime)
          const excelExt = toExcelImageExtension(inferredExt)
          if (excelExt) {
            bytes = base64ToBytes(info.base64)
            ext = excelExt
          }
        }
      }

      if (!bytes) {
        try {
          if (r.imagePath && isSupabaseConfigured && supabase) {
            const res = await supabase.storage.from('waste-images').download(r.imagePath)
            if (!res.error && res.data) {
              const blob = res.data
              const inferredExt = extFromMime(blob.type) === 'bin' ? extFromPath(r.imagePath) : extFromMime(blob.type)
              const excelExt = toExcelImageExtension(inferredExt)
              if (excelExt) {
                bytes = new Uint8Array(await blob.arrayBuffer())
                ext = excelExt
              }
            }
          } else if (r.imageUrl) {
            const res = await fetch(r.imageUrl)
            if (res.ok) {
              const blob = await res.blob()
              const inferredExt = extFromMime(blob.type) === 'bin' ? extFromPath(r.imageUrl) : extFromMime(blob.type)
              const excelExt = toExcelImageExtension(inferredExt)
              if (excelExt) {
                bytes = new Uint8Array(await blob.arrayBuffer())
                ext = excelExt
              }
            }
          }
        } catch {
          bytes = null
          ext = null
        }
      }

      if (!bytes || !ext) {
        imgCell.value = 'NI PODPRTO'
        continue
      }

      const imageId = wb.addImage({ buffer: bytes, extension: ext })
      wasteSheet.getRow(rowNumber).height = 64
      wasteSheet.addImage(imageId, {
        tl: { col: 8.05, row: rowNumber - 1 + 0.1 },
        ext: { width: 84, height: 56 },
        editAs: 'oneCell',
      })
      imgCell.value = 'DA'
    }

    const salesSheet = wb.addWorksheet('Prodaja')
    salesSheet.columns = [
      { header: 'Skupina', key: 'group', width: 12 },
      { header: 'Izdelek', key: 'name', width: 26 },
      { header: 'Količina', key: 'count', width: 10 },
    ]
    addHeader(salesSheet, 1)
    salesPizza.forEach((s) => salesSheet.addRow({ group: 'Pizza', name: s.name, count: s.count }))
    salesPotato.forEach((s) => salesSheet.addRow({ group: 'Krompir', name: s.name, count: s.count }))
    salesCake.forEach((s) => salesSheet.addRow({ group: 'Tortice', name: s.name, count: s.count }))

    const cakesSheet = wb.addWorksheet('Tortice vitrina')
    cakesSheet.columns = [
      { header: 'Tortica', key: 'name', width: 26 },
      { header: 'V vitrini', key: 'inv', width: 12 },
      { header: 'Prodano', key: 'sold', width: 12 },
    ]
    addHeader(cakesSheet, 1)
    const cakeInv = activeLog.cakeInventory || {}
    const cakeSold = activeLog.cakeSold || {}
    const cakeNames = Array.from(
      new Set([...Object.keys(cakeInv || {}), ...Object.keys(cakeSold || {})].filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b))
    cakeNames.forEach((name) => {
      cakesSheet.addRow({
        name,
        inv: cakeInv[name] ?? 0,
        sold: cakeSold[name] ?? 0,
      })
    })

    const potatoBatchesSheet = wb.addWorksheet('Krompir peke')
    potatoBatchesSheet.columns = [
      { header: 'Čas', key: 'createdAt', width: 20 },
      { header: 'Kg', key: 'kg', width: 10 },
      { header: 'ID', key: 'id', width: 36 },
    ]
    addHeader(potatoBatchesSheet, 1)
    ;(activeLog.potatoBatches || []).forEach((b) => {
      potatoBatchesSheet.addRow({ createdAt: b.createdAt || '', kg: b.kg ?? '', id: b.id || '' })
    })

    const boardSheet = wb.addWorksheet('Odprti računi')
    boardSheet.columns = [
      { header: 'Čas', key: 'createdAt', width: 20 },
      { header: 'Zaposleni', key: 'email', width: 28 },
      { header: 'Gost', key: 'guestName', width: 18 },
      { header: 'Ura', key: 'time', width: 10 },
      { header: 'Račun', key: 'items', width: 50 },
      { header: 'ID', key: 'id', width: 36 },
    ]
    addHeader(boardSheet, 1)
    filteredBoardEntries.forEach((o) => {
      boardSheet.addRow({
        createdAt: o.createdAt || '',
        email: o.email || '',
        guestName: o.guestName || '',
        time: o.time || '',
        items: o.items || '',
        id: o.id || '',
      })
    })

    const bytes = await wb.xlsx.writeBuffer()
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, `dbistro_${fileSafeDate}_${fileSafeEmployee}.xlsx`)
  }

  async function downloadWasteImages() {
    const list = filteredWasteEntries.filter((r) => r && (r.imageUrl || r.imagePath))
    const zip = new JSZip()

    for (const r of list) {
      const fileBase = sanitizeFileName(
        `${activeDateKey}_${String(r.email || 'zaposleni')}_${String(r.id || '')}_${String(r.createdAt || '')}`,
      )
      if (r.imageUrl) {
        const info = dataUrlInfo(r.imageUrl)
        if (info) {
          const ext = extFromMime(info.mime)
          zip.file(`${fileBase}.${ext}`, info.base64, { base64: true })
          continue
        }
      }
      try {
        if (r.imagePath && isSupabaseConfigured && supabase) {
          const res = await supabase.storage.from('waste-images').download(r.imagePath)
          if (res.error || !res.data) continue
          const blob = res.data
          const typeExt = extFromMime(blob.type)
          const pathExt = (String(r.imagePath).split('.').pop() || '').trim().toLowerCase()
          const ext = typeExt !== 'bin' ? typeExt : pathExt || 'bin'
          zip.file(`${fileBase}.${ext}`, blob)
        } else if (r.imageUrl) {
          const res = await fetch(r.imageUrl)
          if (!res.ok) continue
          const blob = await res.blob()
          const ext = extFromMime(blob.type)
          zip.file(`${fileBase}.${ext}`, blob)
        }
      } catch {
        continue
      }
    }

    const out = await zip.generateAsync({ type: 'blob' })
    const fileSafeDate = sanitizeFileName(activeDateKey)
    const fileSafeEmployee = employeeFilter ? sanitizeFileName(employeeFilter) : 'vsi'
    downloadBlob(out, `dbistro_slike_${fileSafeDate}_${fileSafeEmployee}.zip`)
  }

  return (
    <PageLayout title="Admin">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-500">
            Datum
          </div>
          <div className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-neutral-900/20">
            {activeDateKey}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-neutral-500">Zaposleni</div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-12 w-full rounded-2xl bg-neutral-50 px-3 text-sm font-semibold text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Vsi zaposleni</option>
              {employees.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={exportExcel}
              className="h-12 rounded-2xl bg-amber-500 px-3 text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 ring-1 ring-amber-600/30"
            >
              Excel
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={downloadWasteImages}
              className="h-12 rounded-2xl bg-neutral-900 px-3 text-sm font-extrabold text-white shadow-lg shadow-neutral-900/20 ring-1 ring-neutral-900/10"
            >
              Slike
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const ok = window.confirm(`Pobrišem vse podatke za ${activeDateKey}?`)
                if (!ok) return
                actions.resetDay(activeDateKey)
              }}
              className="h-12 rounded-2xl bg-rose-600 px-3 text-sm font-extrabold text-white shadow-lg shadow-rose-600/25 ring-1 ring-rose-700/30"
            >
              Reset
            </motion.button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { icon: '🍕', label: 'Pice', value: pizzasTotal },
            { icon: '☕', label: 'Kave', value: activeLog.coffeeCount },
            { icon: '🗑', label: 'Odpisi', value: activeLog.wasteLogs.length },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/95 p-3 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
            >
              <div className="text-lg">{s.icon}</div>
              <div className="mt-1 text-xs font-semibold text-neutral-500">{s.label}</div>
              <div className="text-xl font-extrabold tracking-tight text-neutral-900">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {['Kave in malice', 'Odpisi', 'Prodaja', 'Količine', 'Odprti računi'].map((v) => (
            <SegButton key={v} label={v} active={view === v} onClick={() => setView(v)} />
          ))}
        </div>
      </div>

      {view === 'Kave in malice' ? (
        <div className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Malice
            </div>
            <div className="mt-3 space-y-2">
              {filteredLunchEntries.length === 0 ? (
                <div className="text-sm font-semibold text-neutral-500">Ni vpisov.</div>
              ) : (
                filteredLunchEntries.slice(0, 30).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-neutral-900">{e.item}</div>
                      <div className="text-xs font-semibold text-neutral-500">{e.email}</div>
                    </div>
                    <div className="text-xs font-semibold text-neutral-500">
                      {formatDateTime(e.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Kave
            </div>
            <div className="mt-3 space-y-2">
              {filteredCoffeeEntries.length === 0 ? (
                <div className="text-sm font-semibold text-neutral-500">Ni vpisov.</div>
              ) : (
                filteredCoffeeEntries.slice(0, 30).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3">
                    <div className="text-sm font-extrabold text-neutral-900">
                      {e.email || '—'}
                    </div>
                    <div className="text-xs font-semibold text-neutral-500">
                      {formatDateTime(e.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {view === 'Odpisi' ? (
        <div className="mt-4 space-y-3">
          {filteredWasteEntries.length === 0 ? (
            <Card className="p-4">
              <div className="text-sm font-semibold text-neutral-500">Ni vpisov.</div>
            </Card>
          ) : (
            filteredWasteEntries.slice(0, wasteVisible).map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-neutral-900">
                      {r.category === 'Potatoes'
                        ? 'Krompir'
                        : r.category === 'Dough'
                          ? 'Testo'
                          : r.category === 'Cake'
                            ? 'Tortice'
                            : 'Po meri'}
                    </div>
                    <div className="text-xs font-semibold text-neutral-500">
                      {r.quantity} {r.unit || ''}
                    </div>
                    {r.email ? (
                      <div className="text-xs font-semibold text-neutral-500">{r.email}</div>
                    ) : null}
                    {r.customItem ? (
                      <div className="text-xs font-semibold text-neutral-500">{r.customItem}</div>
                    ) : null}
                    {r.cakeType ? (
                      <div className="text-xs font-semibold text-neutral-500">{r.cakeType}</div>
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    {formatDateTime(r.createdAt)}
                  </div>
                </div>
                {r.note ? (
                  <div className="mt-2 rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                    {r.note}
                  </div>
                ) : null}
                {r.imageUrl ? (
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                    <img src={r.imageUrl} alt="Slika" className="h-40 w-full object-cover" />
                  </div>
                ) : null}
                {!r.imageUrl && r.imagePath && imageSrcByPath[r.imagePath] ? (
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                    <img
                      src={imageSrcByPath[r.imagePath]}
                      alt="Slika"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ) : null}
              </Card>
            ))
          )}
          {filteredWasteEntries.length > wasteVisible ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setWasteVisible((n) => n + 10)}
                className="h-10 rounded-2xl bg-white/95 px-4 text-xs font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
              >
                Prikaži več vpisov
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {view === 'Prodaja' ? (
        <div className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Pizza prodaja
            </div>
            <div className="mt-3 space-y-2">
              {salesPizza.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{s.name}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{s.count}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Krompir prodaja
            </div>
            <div className="mt-3 space-y-2">
              {salesPotato.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{s.name}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{s.count}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Tortice prodaja
            </div>
            <div className="mt-3 space-y-2">
              {salesCake.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{s.name}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{s.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {view === 'Odprti računi' ? (
        <div className="mt-4 space-y-3">
          {filteredBoardEntries.length === 0 ? (
            <Card className="p-4">
              <div className="text-sm font-semibold text-neutral-500">Ni vpisov.</div>
            </Card>
          ) : (
            filteredBoardEntries.slice(0, boardVisible).map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-neutral-900">{o.guestName}</div>
                    <div className="text-sm font-semibold text-neutral-500">{o.time || '—'}</div>
                    {o.email ? (
                      <div className="text-xs font-semibold text-neutral-500">{o.email}</div>
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    {formatDateTime(o.createdAt)}
                  </div>
                </div>
                <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800 ring-1 ring-neutral-200">
                  {o.items}
                </div>
              </Card>
            ))
          )}
          {filteredBoardEntries.length > boardVisible ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setBoardVisible((n) => n + 10)}
                className="h-10 rounded-2xl bg-white/95 px-4 text-xs font-extrabold text-neutral-900 shadow-lg shadow-neutral-900/5 ring-1 ring-neutral-200"
              >
                Prikaži več vpisov
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {view === 'Količine' ? (
        <div className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Testo
            </div>
            <div className="mt-2 text-xs font-semibold text-neutral-500">
              Preostanek: {activeLog.doughCount.remaining} kroglic
            </div>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Zjutraj', value: activeLog.doughCount.manual.morning },
                { label: 'Ob smeni', value: activeLog.doughCount.manual.shift },
                { label: 'Zvečer', value: activeLog.doughCount.manual.evening },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{r.label}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{r.value || '—'}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Krompir
            </div>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Zjutraj', value: activeLog.potatoManual.morning },
                { label: 'Ob smeni', value: activeLog.potatoManual.shift },
                { label: 'Zvečer', value: activeLog.potatoManual.evening },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{r.label}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{r.value || '—'}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-extrabold tracking-tight text-neutral-900">
              Tortice
            </div>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Zjutraj', value: activeLog.cakeManual.morning },
                { label: 'Ob smeni', value: activeLog.cakeManual.shift },
                { label: 'Zvečer', value: activeLog.cakeManual.evening },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-neutral-700">{r.label}</div>
                  <div className="text-sm font-extrabold text-neutral-900">{r.value || '—'}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </PageLayout>
  )
}
