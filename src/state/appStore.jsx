import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'

const STORAGE_KEY = 'dbistro:store:v1'

const PIZZA_TYPES = ['Pepperoni', 'Morska', 'Klasika', 'Tuna']
const POTATO_SALES = [
  'Pulled Beef',
  'Pulled Pork',
  'Pulled Chicken',
  'Chilli con carne',
  'Spicy Chilli',
]
const CAKE_TYPES = [
  'Skutni retaš',
  'Cheesecake',
  'Korenčkova torta',
  'Mango torta',
  'Panacotta',
  'Rogljički',
]

function getTodayKey() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeCountsMap(keys) {
  return keys.reduce((acc, k) => {
    acc[k] = 0
    return acc
  }, {})
}

function emptyConfirmMap() {
  return { morning: null, shift: null, evening: null }
}

function defaultDailyLog() {
  return {
    doughCount: {
      remaining: 54,
      manual: { morning: '', shift: '', evening: '' },
      manualConfirmed: emptyConfirmMap(),
    },
    pizzaSales: makeCountsMap(PIZZA_TYPES),
    potatoBatches: [],
    potatoSales: makeCountsMap(POTATO_SALES),
    potatoManual: { morning: '', shift: '', evening: '' },
    potatoManualConfirmed: emptyConfirmMap(),
    potatoWasteKg: 0,
    cakeInventory: makeCountsMap(CAKE_TYPES),
    cakeSold: makeCountsMap(CAKE_TYPES),
    cakeManual: { morning: '', shift: '', evening: '' },
    cakeManualConfirmed: emptyConfirmMap(),
    coffeeCount: 0,
    coffeeLogs: [],
    lunchLogs: {},
    wasteLogs: [],
    boardOrders: [],
    announcement: { text: '', at: '', by: '' },
    tasks: [],
  }
}

function isEmptyDailyLog(log) {
  if (!log || typeof log !== 'object') return true

  const dough = log.doughCount || {}
  const doughRemaining = clampToZero(parseNumber(dough.remaining) ?? 54)
  if (doughRemaining !== 54) return false
  const doughManual = dough.manual || {}
  if (
    String(doughManual.morning || '').trim() ||
    String(doughManual.shift || '').trim() ||
    String(doughManual.evening || '').trim()
  ) {
    return false
  }
  const doughConfirmed = dough.manualConfirmed || {}
  if (doughConfirmed.morning || doughConfirmed.shift || doughConfirmed.evening) return false

  const pizzaSales = log.pizzaSales || {}
  if (PIZZA_TYPES.some((k) => clampToZero(parseNumber(pizzaSales[k]) ?? 0) !== 0)) return false

  const potatoBatches = Array.isArray(log.potatoBatches) ? log.potatoBatches : []
  if (potatoBatches.length > 0) return false
  const potatoSales = log.potatoSales || {}
  if (POTATO_SALES.some((k) => clampToZero(parseNumber(potatoSales[k]) ?? 0) !== 0)) return false
  const potatoManual = log.potatoManual || {}
  if (
    String(potatoManual.morning || '').trim() ||
    String(potatoManual.shift || '').trim() ||
    String(potatoManual.evening || '').trim()
  ) {
    return false
  }
  const potatoConfirmed = log.potatoManualConfirmed || {}
  if (potatoConfirmed.morning || potatoConfirmed.shift || potatoConfirmed.evening) return false
  if (clampToZero(parseNumber(log.potatoWasteKg) ?? 0) !== 0) return false

  const cakeInventory = log.cakeInventory || {}
  if (CAKE_TYPES.some((k) => clampToZero(parseNumber(cakeInventory[k]) ?? 0) !== 0)) return false
  const cakeSold = log.cakeSold || {}
  if (CAKE_TYPES.some((k) => clampToZero(parseNumber(cakeSold[k]) ?? 0) !== 0)) return false
  const cakeManual = log.cakeManual || {}
  if (
    String(cakeManual.morning || '').trim() ||
    String(cakeManual.shift || '').trim() ||
    String(cakeManual.evening || '').trim()
  ) {
    return false
  }
  const cakeConfirmed = log.cakeManualConfirmed || {}
  if (cakeConfirmed.morning || cakeConfirmed.shift || cakeConfirmed.evening) return false

  const coffeeLogs = Array.isArray(log.coffeeLogs) ? log.coffeeLogs : []
  if (coffeeLogs.length > 0) return false
  if (clampToZero(parseNumber(log.coffeeCount) ?? 0) !== 0) return false

  const lunchLogs = log.lunchLogs && typeof log.lunchLogs === 'object' ? log.lunchLogs : {}
  if (Object.keys(lunchLogs).length > 0) return false

  const wasteLogs = Array.isArray(log.wasteLogs) ? log.wasteLogs : []
  if (wasteLogs.length > 0) return false

  const boardOrders = Array.isArray(log.boardOrders) ? log.boardOrders : []
  if (boardOrders.length > 0) return false

  const announcement = log.announcement && typeof log.announcement === 'object' ? log.announcement : {}
  if (String(announcement.text || '').trim()) return false

  const tasks = Array.isArray(log.tasks) ? log.tasks : []
  if (tasks.length > 0) return false

  return true
}

const defaultState = {
  session: {
    loggedIn: false,
    userId: '',
    email: '',
    username: '',
    role: '',
    isAdmin: false,
  },
  activeDateKey: getTodayKey(),
  logsByDate: {
    [getTodayKey()]: defaultDailyLog(),
  },
  syncMetaByDate: {},
}

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function clampToZero(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function parseNumber(value) {
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function ensureLog(state, dateKey) {
  if (state.logsByDate[dateKey]) return state
  return {
    ...state,
    logsByDate: { ...state.logsByDate, [dateKey]: defaultDailyLog() },
  }
}

function withActiveLog(state, updater) {
  const dateKey = state.activeDateKey || getTodayKey()
  const ensured = ensureLog(state, dateKey)
  const current = ensured.logsByDate[dateKey]
  const next = updater(current, dateKey)
  if (next === current) return ensured
  return {
    ...ensured,
    logsByDate: { ...ensured.logsByDate, [dateKey]: next },
  }
}

function migrateToDailyState(saved) {
  const todayKey = getTodayKey()
  const base = {
    ...defaultState,
    activeDateKey: todayKey,
    logsByDate: { [todayKey]: defaultDailyLog() },
  }

  if (!saved || typeof saved !== 'object') return base

  if (saved.logsByDate && typeof saved.logsByDate === 'object') {
    const activeDateKey =
      typeof saved.activeDateKey === 'string' ? saved.activeDateKey : todayKey
    const merged = {
      ...base,
      ...saved,
      session: { ...base.session, ...(saved.session || {}) },
      activeDateKey,
      logsByDate: { ...base.logsByDate, ...(saved.logsByDate || {}) },
    }
    if ('accountEntries' in merged) {
      const { accountEntries: _ignored, ...rest } = merged
      return ensureLog(rest, activeDateKey)
    }
    return ensureLog(merged, activeDateKey)
  }

  const log = defaultDailyLog()
  if (saved.pizzaCounts && typeof saved.pizzaCounts === 'object') {
    log.pizzaSales = { ...log.pizzaSales, ...saved.pizzaCounts }
  }
  if (saved.cakesCounts && typeof saved.cakesCounts === 'object') {
    log.cakeInventory = { ...log.cakeInventory, ...saved.cakesCounts }
  }
  if (saved.coffee && typeof saved.coffee === 'object') {
    const n = parseNumber(saved.coffee.todayCount)
    if (n != null) log.coffeeCount = clampToZero(n)
  }
  if (saved.potato && typeof saved.potato === 'object') {
    if (saved.potato.salesCounts && typeof saved.potato.salesCounts === 'object') {
      log.potatoSales = { ...log.potatoSales, ...saved.potato.salesCounts }
    }
  }
  if (Array.isArray(saved.dejanOrders)) log.boardOrders = saved.dejanOrders
  if (Array.isArray(saved.wasteReports)) log.wasteLogs = saved.wasteReports
  if (Array.isArray(saved.lunchLogs)) {
    log.lunchLogs = saved.lunchLogs.reduce((acc, entry) => {
      if (entry && entry.email) acc[entry.email] = entry
      return acc
    }, {})
  }

  return {
    ...base,
    session: { ...base.session, ...(saved.session || {}) },
    logsByDate: { [todayKey]: log },
  }
}

function loadInitialState() {
  const saved = safeParse(localStorage.getItem(STORAGE_KEY) || '')
  return migrateToDailyState(saved)
}

function reducer(state, action) {
  switch (action.type) {
    case 'session/set': {
      const email = String(action.email || '').trim()
      const userId = String(action.userId || '').trim()
      const username = String(action.username || '').trim()
      const role = String(action.role || '').trim()
      const isAdmin = Boolean(action.isAdmin)
      if (!email || !userId) return state
      return { ...state, session: { loggedIn: true, userId, email, username, role, isAdmin } }
    }
    case 'session/clear': {
      return {
        ...state,
        session: {
          loggedIn: false,
          userId: '',
          email: '',
          username: '',
          role: '',
          isAdmin: false,
        },
      }
    }
    case 'sync/pushed': {
      const dateKey = String(action.dateKey || '').trim()
      const at = String(action.at || '').trim()
      if (!dateKey || !at) return state
      const prev = state.syncMetaByDate || {}
      const nextForDay = { ...(prev[dateKey] || {}), lastPushedAt: at }
      return { ...state, syncMetaByDate: { ...prev, [dateKey]: nextForDay } }
    }
    case 'sync/remoteApplied': {
      const dateKey = String(action.dateKey || '').trim()
      const at = String(action.at || '').trim()
      if (!dateKey || !at) return state
      const prev = state.syncMetaByDate || {}
      const nextForDay = { ...(prev[dateKey] || {}), remoteUpdatedAt: at }
      return { ...state, syncMetaByDate: { ...prev, [dateKey]: nextForDay } }
    }
    case 'sync/clearSkipNextPush': {
      const dateKey = String(action.dateKey || '').trim()
      if (!dateKey) return state
      const prev = state.syncMetaByDate || {}
      const current = prev[dateKey] || {}
      if (!current.skipNextPush) return state
      const nextForDay = { ...current }
      delete nextForDay.skipNextPush
      return { ...state, syncMetaByDate: { ...prev, [dateKey]: nextForDay } }
    }
    case 'logs/replaceForDay': {
      const dateKey = String(action.dateKey || '').trim()
      const log = action.log
      if (!dateKey || !log || typeof log !== 'object') return state
      const ensured = ensureLog(state, dateKey)
      const prevMeta = ensured.syncMetaByDate || {}
      const nextMeta = {
        ...(prevMeta[dateKey] || {}),
        remoteUpdatedAt: String(action.remoteUpdatedAt || '').trim() || new Date().toISOString(),
        skipNextPush: true,
      }
      return {
        ...ensured,
        logsByDate: { ...ensured.logsByDate, [dateKey]: log },
        syncMetaByDate: { ...prevMeta, [dateKey]: nextMeta },
      }
    }
    case 'logs/resetForDay': {
      const dateKey = String(action.dateKey || '').trim() || getTodayKey()
      const ensured = ensureLog(state, dateKey)
      const prevMeta = ensured.syncMetaByDate || {}
      const nextMeta = { ...prevMeta }
      delete nextMeta[dateKey]
      return {
        ...ensured,
        logsByDate: { ...ensured.logsByDate, [dateKey]: defaultDailyLog() },
        syncMetaByDate: nextMeta,
      }
    }
    case 'day/setActive': {
      const dateKey = typeof action.dateKey === 'string' ? action.dateKey : getTodayKey()
      const next = ensureLog({ ...state, activeDateKey: dateKey }, dateKey)
      return next
    }
    case 'board/setAnnouncement': {
      if (!action.isAdmin) return state
      const text = String(action.text || '').trim()
      const by = String(action.by || '').trim()
      return withActiveLog(state, (log) => {
        return {
          ...log,
          announcement: { text, at: new Date().toISOString(), by },
        }
      })
    }
    case 'tasks/add': {
      if (!action.isAdmin) return state
      const text = String(action.text || '').trim()
      if (!text) return state
      const by = String(action.by || '').trim()
      const entry = {
        id: crypto.randomUUID(),
        text,
        done: false,
        createdAt: new Date().toISOString(),
        createdBy: by,
        doneAt: '',
        doneBy: '',
      }
      return withActiveLog(state, (log) => {
        const prev = Array.isArray(log.tasks) ? log.tasks : []
        return {
          ...log,
          tasks: [entry, ...prev],
        }
      })
    }
    case 'tasks/toggle': {
      const id = String(action.id || '').trim()
      if (!id) return state
      const by = String(action.by || '').trim()
      return withActiveLog(state, (log) => {
        const prev = Array.isArray(log.tasks) ? log.tasks : []
        if (prev.length === 0) return log
        const next = prev.map((t) => {
          if (!t || t.id !== id) return t
          const done = !Boolean(t.done)
          return {
            ...t,
            done,
            doneAt: done ? new Date().toISOString() : '',
            doneBy: done ? by : '',
          }
        })
        return { ...log, tasks: next }
      })
    }
    case 'tasks/delete': {
      if (!action.isAdmin) return state
      const id = String(action.id || '').trim()
      if (!id) return state
      return withActiveLog(state, (log) => {
        const prev = Array.isArray(log.tasks) ? log.tasks : []
        if (prev.length === 0) return log
        return { ...log, tasks: prev.filter((t) => t && t.id !== id) }
      })
    }
    case 'dough/newBatch': {
      return withActiveLog(state, (log) => {
        const prevRemaining = clampToZero(parseNumber(log?.doughCount?.remaining) ?? 0)
        const byEmail = String(action.email || '').trim()
        const entry =
          prevRemaining > 0
            ? {
                id: crypto.randomUUID(),
                email: byEmail,
                category: 'Dough',
                quantity: prevRemaining,
                unit: 'kroglic',
                note: 'Nova runda testa',
                createdAt: new Date().toISOString(),
              }
            : null
        return {
          ...log,
          doughCount: { ...log.doughCount, remaining: 54 },
          wasteLogs: entry ? [entry, ...log.wasteLogs] : log.wasteLogs,
        }
      })
    }
    case 'dough/discard': {
      const qty = clampToZero(Math.round(parseNumber(action.quantity) ?? 1))
      if (qty <= 0) return state
      return withActiveLog(state, (log) => {
        const remaining = clampToZero(log.doughCount.remaining - qty)
        const entry = {
          id: crypto.randomUUID(),
          category: 'Dough',
          quantity: qty,
          unit: 'kroglic',
          note: action.note || '',
          createdAt: new Date().toISOString(),
        }
        return {
          ...log,
          doughCount: { ...log.doughCount, remaining },
          wasteLogs: [entry, ...log.wasteLogs],
        }
      })
    }
    case 'dough/manualSet': {
      const slot = action.slot
      const value = action.value
      return withActiveLog(state, (log) => {
        const confirmed = log?.doughCount?.manualConfirmed?.[slot]
        if (confirmed) return log
        return {
          ...log,
          doughCount: {
            ...log.doughCount,
            manual: { ...log.doughCount.manual, [slot]: value },
          },
        }
      })
    }
    case 'dough/manualConfirm': {
      const slot = action.slot
      const by = String(action.by || '').trim()
      return withActiveLog(state, (log) => {
        const current = String(log?.doughCount?.manual?.[slot] ?? '').trim()
        if (!current) return log
        const prevConfirmed = log?.doughCount?.manualConfirmed || emptyConfirmMap()
        if (prevConfirmed?.[slot]) return log
        return {
          ...log,
          doughCount: {
            ...log.doughCount,
            manualConfirmed: {
              ...prevConfirmed,
              [slot]: { value: current, at: new Date().toISOString(), by },
            },
          },
        }
      })
    }
    case 'dough/manualUnconfirm': {
      const slot = action.slot
      const isAdmin = Boolean(action.isAdmin)
      if (!isAdmin) return state
      return withActiveLog(state, (log) => {
        const prevConfirmed = log?.doughCount?.manualConfirmed || emptyConfirmMap()
        if (!prevConfirmed?.[slot]) return log
        return {
          ...log,
          doughCount: {
            ...log.doughCount,
            manualConfirmed: { ...prevConfirmed, [slot]: null },
          },
        }
      })
    }
    case 'pizza/sell': {
      const type = action.pizzaType
      return withActiveLog(state, (log) => {
        const canSell = log.doughCount.remaining > 0
        const remaining = canSell ? log.doughCount.remaining - 1 : log.doughCount.remaining
        return {
          ...log,
          doughCount: { ...log.doughCount, remaining },
          pizzaSales: {
            ...log.pizzaSales,
            [type]: (log.pizzaSales[type] || 0) + (canSell ? 1 : 0),
          },
        }
      })
    }
    case 'coffee/drink': {
      const email = String(action.email || '').trim()
      return withActiveLog(state, (log) => {
        const entry = {
          id: crypto.randomUUID(),
          email,
          createdAt: new Date().toISOString(),
        }
        const prevLogs = Array.isArray(log.coffeeLogs) ? log.coffeeLogs : []
        return {
          ...log,
          coffeeCount: (parseNumber(log.coffeeCount) ?? 0) + 1,
          coffeeLogs: [entry, ...prevLogs],
        }
      })
    }
    case 'potato/addBatch': {
      const kg = parseNumber(action.kg)
      if (kg == null || kg <= 0) return state
      return withActiveLog(state, (log) => {
        const batch = {
          id: crypto.randomUUID(),
          kg,
          createdAt: new Date().toISOString(),
        }
        return { ...log, potatoBatches: [...log.potatoBatches, batch] }
      })
    }
    case 'potato/sell': {
      const item = action.item
      return withActiveLog(state, (log) => {
        const bakedKg = log.potatoBatches.reduce(
          (sum, b) => sum + (parseNumber(b.kg) || 0),
          0,
        )
        const soldPortions = Object.values(log.potatoSales).reduce(
          (sum, v) => sum + (parseNumber(v) || 0),
          0,
        )
        const consumedKg = soldPortions * 0.2
        const remainingKg = bakedKg - consumedKg - (log.potatoWasteKg || 0)
        if (remainingKg < 0.2) return log

        return {
          ...log,
          potatoSales: {
            ...log.potatoSales,
            [item]: (log.potatoSales[item] || 0) + 1,
          },
        }
      })
    }
    case 'potato/manualSet': {
      const slot = action.slot
      const value = action.value
      return withActiveLog(state, (log) => {
        const confirmed = log?.potatoManualConfirmed?.[slot]
        if (confirmed) return log
        return { ...log, potatoManual: { ...log.potatoManual, [slot]: value } }
      })
    }
    case 'potato/manualConfirm': {
      const slot = action.slot
      const by = String(action.by || '').trim()
      return withActiveLog(state, (log) => {
        const current = String(log?.potatoManual?.[slot] ?? '').trim()
        if (!current) return log
        const prevConfirmed = log?.potatoManualConfirmed || emptyConfirmMap()
        if (prevConfirmed?.[slot]) return log
        return {
          ...log,
          potatoManualConfirmed: {
            ...prevConfirmed,
            [slot]: { value: current, at: new Date().toISOString(), by },
          },
        }
      })
    }
    case 'potato/manualUnconfirm': {
      const slot = action.slot
      const isAdmin = Boolean(action.isAdmin)
      if (!isAdmin) return state
      return withActiveLog(state, (log) => {
        const prevConfirmed = log?.potatoManualConfirmed || emptyConfirmMap()
        if (!prevConfirmed?.[slot]) return log
        return {
          ...log,
          potatoManualConfirmed: { ...prevConfirmed, [slot]: null },
        }
      })
    }
    case 'cakes/adjust': {
      const name = action.name
      const delta = Number(action.delta) || 0
      return withActiveLog(state, (log) => {
        const current = (log.cakeInventory && log.cakeInventory[name]) || 0
        const next = clampToZero(current + delta)
        return {
          ...log,
          cakeInventory: { ...(log.cakeInventory || makeCountsMap(CAKE_TYPES)), [name]: next },
        }
      })
    }
    case 'cakes/setInventory': {
      const name = action.name
      const value = clampToZero(parseNumber(action.value) ?? 0)
      return withActiveLog(state, (log) => {
        return {
          ...log,
          cakeInventory: { ...(log.cakeInventory || makeCountsMap(CAKE_TYPES)), [name]: value },
        }
      })
    }
    case 'cakes/add': {
      const name = action.name
      const qty = clampToZero(Math.round(parseNumber(action.quantity) ?? 1))
      if (qty <= 0) return state
      return withActiveLog(state, (log) => {
        const current = (log.cakeInventory && log.cakeInventory[name]) || 0
        return {
          ...log,
          cakeInventory: {
            ...(log.cakeInventory || makeCountsMap(CAKE_TYPES)),
            [name]: clampToZero(current + qty),
          },
        }
      })
    }
    case 'cakes/sell': {
      const name = action.name
      const qty = clampToZero(Math.round(parseNumber(action.quantity) ?? 1))
      if (qty <= 0) return state
      return withActiveLog(state, (log) => {
        const currentInv = (log.cakeInventory && log.cakeInventory[name]) || 0
        const sellQty = Math.min(currentInv, qty)
        if (sellQty <= 0) return log
        const currentSold = (log.cakeSold && log.cakeSold[name]) || 0
        return {
          ...log,
          cakeInventory: {
            ...(log.cakeInventory || makeCountsMap(CAKE_TYPES)),
            [name]: clampToZero(currentInv - sellQty),
          },
          cakeSold: {
            ...(log.cakeSold || makeCountsMap(CAKE_TYPES)),
            [name]: currentSold + sellQty,
          },
        }
      })
    }
    case 'cakes/manualSet': {
      const slot = action.slot
      const value = action.value
      return withActiveLog(state, (log) => {
        const confirmed = log?.cakeManualConfirmed?.[slot]
        if (confirmed) return log
        return { ...log, cakeManual: { ...log.cakeManual, [slot]: value } }
      })
    }
    case 'cakes/manualConfirm': {
      const slot = action.slot
      const by = String(action.by || '').trim()
      return withActiveLog(state, (log) => {
        const current = String(log?.cakeManual?.[slot] ?? '').trim()
        if (!current) return log
        const prevConfirmed = log?.cakeManualConfirmed || emptyConfirmMap()
        if (prevConfirmed?.[slot]) return log
        return {
          ...log,
          cakeManualConfirmed: {
            ...prevConfirmed,
            [slot]: { value: current, at: new Date().toISOString(), by },
          },
        }
      })
    }
    case 'cakes/manualUnconfirm': {
      const slot = action.slot
      const isAdmin = Boolean(action.isAdmin)
      if (!isAdmin) return state
      return withActiveLog(state, (log) => {
        const prevConfirmed = log?.cakeManualConfirmed || emptyConfirmMap()
        if (!prevConfirmed?.[slot]) return log
        return {
          ...log,
          cakeManualConfirmed: { ...prevConfirmed, [slot]: null },
        }
      })
    }
    case 'lunch/submit': {
      const email = String(action.email || '').trim()
      const item = String(action.item || '').trim()
      if (!email || !item) return state
      return withActiveLog(state, (log) => {
        if (log.lunchLogs[email]) return log
        const entry = {
          id: crypto.randomUUID(),
          email,
          item,
          createdAt: new Date().toISOString(),
        }
        return { ...log, lunchLogs: { ...log.lunchLogs, [email]: entry } }
      })
    }
    case 'waste/add': {
      const entry = action.entry
      if (!entry || typeof entry !== 'object') return state
      return withActiveLog(state, (log) => {
        const qty = parseNumber(entry.quantity)
        const normalized = {
          id: entry.id || crypto.randomUUID(),
          email: (entry.email || '').trim(),
          category: entry.category || 'Custom',
          quantity: qty == null ? 0 : qty,
          unit: entry.unit || '',
          note: entry.note || '',
          imageUrl: entry.imageUrl || '',
          imagePath: entry.imagePath || '',
          cakeType: entry.cakeType || '',
          customItem: entry.customItem || '',
          createdAt: entry.createdAt || new Date().toISOString(),
        }

        const roundedQuantity =
          normalized.category === 'Dough' || normalized.category === 'Cake'
            ? Math.round(normalized.quantity)
            : normalized.quantity

        const nextNormalized = { ...normalized, quantity: roundedQuantity }
        let nextLog = { ...log, wasteLogs: [nextNormalized, ...log.wasteLogs] }

        if (normalized.category === 'Dough') {
          const balls = clampToZero(Math.round(normalized.quantity))
          nextLog = {
            ...nextLog,
            doughCount: {
              ...nextLog.doughCount,
              remaining: clampToZero(nextLog.doughCount.remaining - balls),
            },
          }
        }

        if (normalized.category === 'Potatoes') {
          const kg = clampToZero(normalized.quantity)
          nextLog = { ...nextLog, potatoWasteKg: nextLog.potatoWasteKg + kg }
        }

        if (normalized.category === 'Cake' && normalized.cakeType) {
          const pieces = clampToZero(Math.round(normalized.quantity))
          if (pieces > 0) {
            const current =
              (nextLog.cakeInventory && nextLog.cakeInventory[normalized.cakeType]) || 0
            nextLog = {
              ...nextLog,
              cakeInventory: {
                ...(nextLog.cakeInventory || makeCountsMap(CAKE_TYPES)),
                [normalized.cakeType]: clampToZero(current - pieces),
              },
            }
          }
        }

        return nextLog
      })
    }
    case 'board/add': {
      const entry = action.entry
      if (!entry || typeof entry !== 'object') return state
      return withActiveLog(state, (log) => {
        const normalized = {
          id: entry.id || crypto.randomUUID(),
          email: (entry.email || '').trim(),
          guestName: (entry.guestName || '').trim(),
          time: (entry.time || '').trim(),
          items: (entry.items || '').trim(),
          createdAt: entry.createdAt || new Date().toISOString(),
        }
        return { ...log, boardOrders: [normalized, ...log.boardOrders] }
      })
    }
    default:
      return state
  }
}

const StoreContext = createContext(null)

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)
  const saveTimerRef = useRef(null)
  const lastSavedJsonRef = useRef('')
  const syncMetaRef = useRef(state.syncMetaByDate)
  const sessionRef = useRef(state.session)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    syncMetaRef.current = state.syncMetaByDate
    sessionRef.current = state.session
  }, [state.syncMetaByDate, state.session])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let cancelled = false

    function authEmailToUsername(email) {
      const e = String(email || '').trim()
      if (!e) return ''
      const at = e.indexOf('@')
      return at > 0 ? e.slice(0, at) : e
    }

    function computeIsAdmin(user) {
      const meta = user && typeof user === 'object' ? user.user_metadata || {} : {}
      if (meta && meta.is_admin === true) return true
      const email = String(user?.email || '').trim().toLowerCase()
      const list = String(import.meta.env.VITE_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      return email ? list.includes(email) : false
    }

    async function loadProfile(user) {
      if (!user?.id) return { username: '', role: '' }
      const res = await supabase.from('profiles').select('username, role').eq('id', user.id).maybeSingle()
      const row = res?.data
      return {
        username: String(row?.username || '').trim(),
        role: String(row?.role || '').trim(),
      }
    }

    async function applyUser(user) {
      const fallbackUsername = authEmailToUsername(user?.email)
      let profile = { username: '', role: '' }
      try {
        profile = await loadProfile(user)
      } catch {
        profile = { username: '', role: '' }
      }
      if (cancelled) return
      const username = profile.username || fallbackUsername
      const role = profile.role
      const isAdmin = role === 'admin' || computeIsAdmin(user)
      const display = username || String(user?.email || '').trim()
      dispatch({
        type: 'session/set',
        userId: user.id,
        email: display,
        username,
        role,
        isAdmin,
      })
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return
        const user = data?.session?.user
        if (!user) return
        applyUser(user)
      })
      .catch(() => {})

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const user = session?.user
      if (!user) {
        dispatch({ type: 'session/clear' })
        return
      }
      applyUser(user)
    })

    return () => {
      cancelled = true
      data?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    if (!state.session.loggedIn) return
    const dateKey = state.activeDateKey || getTodayKey()
    let cancelled = false

    async function loadRemote() {
      const res = await supabase
        .from('daily_logs')
        .select('date_key, data, updated_at, updated_by')
        .eq('date_key', dateKey)
        .maybeSingle()
      if (cancelled) return
      const row = res?.data
      if (!row || !row.data) return
      const remoteUpdatedAt = String(row.updated_at || '').trim()
      const prevRemoteAt = String((syncMetaRef.current?.[dateKey] || {}).remoteUpdatedAt || '')
      const prevTs = prevRemoteAt ? Date.parse(prevRemoteAt) : NaN
      const remoteTs = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : NaN
      if (Number.isFinite(prevTs) && Number.isFinite(remoteTs) && remoteTs <= prevTs) return
      dispatch({ type: 'logs/replaceForDay', dateKey, log: row.data, remoteUpdatedAt })
    }

    loadRemote().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [state.session.loggedIn, state.activeDateKey])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    if (!state.session.loggedIn) return
    const dateKey = state.activeDateKey || getTodayKey()

    const channel = supabase
      .channel(`daily_logs:${dateKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `date_key=eq.${dateKey}` },
        (payload) => {
          const row = payload?.new
          if (!row || !row.data) return
          const remoteUpdatedAt = String(row.updated_at || '').trim()
          const meta = syncMetaRef.current?.[dateKey] || {}
          const prevRemoteAt = String(meta.remoteUpdatedAt || '')
          const prevTs = prevRemoteAt ? Date.parse(prevRemoteAt) : NaN
          const remoteTs = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : NaN
          if (Number.isFinite(prevTs) && Number.isFinite(remoteTs) && remoteTs <= prevTs) return
          const lastPushedAt = String(meta.lastPushedAt || '')
          if (row.updated_by && row.updated_by === sessionRef.current?.userId && lastPushedAt) {
            const pushedTs = lastPushedAt ? Date.parse(lastPushedAt) : NaN
            if (Number.isFinite(remoteTs) && Number.isFinite(pushedTs) && remoteTs <= pushedTs) {
              return
            }
          }
          dispatch({ type: 'logs/replaceForDay', dateKey, log: row.data, remoteUpdatedAt })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.session.loggedIn, state.activeDateKey])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    if (!state.session.loggedIn) return
    const dateKey = state.activeDateKey || getTodayKey()
    const raw = state.logsByDate?.[dateKey]
    if (!raw) return

    let json = ''
    try {
      json = JSON.stringify(raw)
    } catch {
      return
    }
    if (json === lastSavedJsonRef.current) return
    lastSavedJsonRef.current = json
    const meta = syncMetaRef.current?.[dateKey] || {}
    if (meta.skipNextPush) {
      dispatch({ type: 'sync/clearSkipNextPush', dateKey })
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const at = new Date().toISOString()
      dispatch({ type: 'sync/pushed', dateKey, at })
      if (isEmptyDailyLog(raw)) {
        await supabase.from('daily_logs').delete().eq('date_key', dateKey)
        return
      }
      await supabase.from('daily_logs').upsert(
        { date_key: dateKey, data: raw, updated_at: at, updated_by: state.session.userId },
        { onConflict: 'date_key' },
      )
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state.session.loggedIn, state.session.userId, state.activeDateKey, state.logsByDate])

  const value = useMemo(() => {
    const todayKey = getTodayKey()
    const activeDateKey = state.activeDateKey || todayKey
    const ensured = ensureLog(state, activeDateKey)
    const rawLog = ensured.logsByDate[activeDateKey]
    const activeLog = {
      ...rawLog,
      doughCount: {
        ...defaultDailyLog().doughCount,
        ...(rawLog.doughCount || {}),
        manual: {
          ...defaultDailyLog().doughCount.manual,
          ...((rawLog.doughCount && rawLog.doughCount.manual) || {}),
        },
        manualConfirmed: {
          ...defaultDailyLog().doughCount.manualConfirmed,
          ...((rawLog.doughCount && rawLog.doughCount.manualConfirmed) || {}),
        },
      },
      pizzaSales: { ...makeCountsMap(PIZZA_TYPES), ...(rawLog.pizzaSales || {}) },
      potatoBatches: Array.isArray(rawLog.potatoBatches) ? rawLog.potatoBatches : [],
      potatoSales: { ...makeCountsMap(POTATO_SALES), ...(rawLog.potatoSales || {}) },
      potatoManual: {
        ...defaultDailyLog().potatoManual,
        ...(rawLog.potatoManual || {}),
      },
      potatoManualConfirmed: {
        ...defaultDailyLog().potatoManualConfirmed,
        ...(rawLog.potatoManualConfirmed || {}),
      },
      potatoWasteKg: parseNumber(rawLog.potatoWasteKg) ?? 0,
      cakeInventory: { ...makeCountsMap(CAKE_TYPES), ...(rawLog.cakeInventory || {}) },
      cakeSold: { ...makeCountsMap(CAKE_TYPES), ...(rawLog.cakeSold || {}) },
      cakeManual: {
        ...defaultDailyLog().cakeManual,
        ...(rawLog.cakeManual || {}),
      },
      cakeManualConfirmed: {
        ...defaultDailyLog().cakeManualConfirmed,
        ...(rawLog.cakeManualConfirmed || {}),
      },
      coffeeLogs: Array.isArray(rawLog.coffeeLogs) ? rawLog.coffeeLogs : [],
      coffeeCount: Array.isArray(rawLog.coffeeLogs)
        ? rawLog.coffeeLogs.length
        : (parseNumber(rawLog.coffeeCount) ?? 0),
      lunchLogs: rawLog.lunchLogs && typeof rawLog.lunchLogs === 'object' ? rawLog.lunchLogs : {},
      wasteLogs: Array.isArray(rawLog.wasteLogs) ? rawLog.wasteLogs : [],
      boardOrders: Array.isArray(rawLog.boardOrders) ? rawLog.boardOrders : [],
    }

    const potatoTotalBakedKg = activeLog.potatoBatches.reduce(
      (sum, b) => sum + (parseNumber(b.kg) || 0),
      0,
    )
    const potatoSoldPortions = Object.values(activeLog.potatoSales).reduce(
      (sum, v) => sum + (parseNumber(v) || 0),
      0,
    )
    const potatoConsumedKg = potatoSoldPortions * 0.2
    const potatoRemainingKg = clampToZero(
      potatoTotalBakedKg - potatoConsumedKg - (activeLog.potatoWasteKg || 0),
    )

    return {
      ...ensured,
      todayKey,
      activeDateKey,
      activeLog,
      derived: {
        potatoTotalBakedKg,
        potatoSoldPortions,
        potatoConsumedKg,
        potatoRemainingKg,
      },
      actions: {
        login: async ({ username, password, mode } = {}) => {
          if (!isSupabaseConfigured || !supabase) {
            return { ok: false, message: 'Supabase ni nastavljen.' }
          }
          const u = String(username || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
          const p = String(password || '')
          if (!u || !p) return { ok: false, message: 'Manjka uporabniško ime ali geslo.' }
          const authEmail = `${u}@dbistro.local`
          if (mode === 'signup') {
            const res = await supabase.auth.signUp({
              email: authEmail,
              password: p,
              options: { data: { username: u, role: 'zaposlen' } },
            })
            if (res.error) return { ok: false, message: res.error.message }
            return { ok: true }
          }
          const res = await supabase.auth.signInWithPassword({ email: authEmail, password: p })
          if (res.error) return { ok: false, message: res.error.message }
          return { ok: true }
        },
        logout: async () => {
          if (!isSupabaseConfigured || !supabase) return
          await supabase.auth.signOut()
        },
        refreshSession: async () => {
          if (!isSupabaseConfigured || !supabase) {
            return { ok: false, message: 'Supabase ni nastavljen.' }
          }
          const authRes = await supabase.auth.getUser()
          const user = authRes?.data?.user
          if (authRes?.error) return { ok: false, message: authRes.error.message }
          if (!user) return { ok: false, message: 'Ni prijavljen.' }

          const e = String(user.email || '').trim()
          const at = e.indexOf('@')
          const fallbackUsername = at > 0 ? e.slice(0, at) : e

          const profileRes = await supabase
            .from('profiles')
            .select('username, role')
            .eq('id', user.id)
            .maybeSingle()
          if (profileRes?.error) return { ok: false, message: profileRes.error.message }

          const username = String(profileRes?.data?.username || '').trim() || fallbackUsername
          const role = String(profileRes?.data?.role || '').trim()
          const list = String(import.meta.env.VITE_ADMIN_EMAILS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
          const byEmail = String(user.email || '').trim().toLowerCase()
          const isAdmin = role === 'admin' || (byEmail ? list.includes(byEmail) : false)
          const display = username || String(user.email || '').trim()

          dispatch({
            type: 'session/set',
            userId: user.id,
            email: display,
            username,
            role,
            isAdmin,
          })

          return { ok: true }
        },
        setActiveDay: (dateKey) => dispatch({ type: 'day/setActive', dateKey }),
        resetDay: (dateKey) => dispatch({ type: 'logs/resetForDay', dateKey }),
        setAnnouncement: (text) =>
          dispatch({
            type: 'board/setAnnouncement',
            text,
            by: state.session.email || '',
            isAdmin: state.session.isAdmin,
          }),
        addTask: (text) =>
          dispatch({
            type: 'tasks/add',
            text,
            by: state.session.email || '',
            isAdmin: state.session.isAdmin,
          }),
        toggleTask: (id) => dispatch({ type: 'tasks/toggle', id, by: state.session.email || '' }),
        deleteTask: (id) =>
          dispatch({ type: 'tasks/delete', id, isAdmin: state.session.isAdmin }),
        newDoughBatch: () => dispatch({ type: 'dough/newBatch', email: state.session.email || '' }),
        discardDough: ({ quantity = 1, note = '' } = {}) =>
          dispatch({ type: 'dough/discard', quantity, note }),
        setDoughManual: (slot, value) =>
          dispatch({ type: 'dough/manualSet', slot, value }),
        confirmDoughManual: (slot) =>
          dispatch({ type: 'dough/manualConfirm', slot, by: state.session.email || '' }),
        unconfirmDoughManual: (slot) =>
          dispatch({ type: 'dough/manualUnconfirm', slot, isAdmin: state.session.isAdmin }),
        sellPizza: (pizzaType) => dispatch({ type: 'pizza/sell', pizzaType }),
        drinkCoffee: ({ email } = {}) => dispatch({ type: 'coffee/drink', email }),
        addPotatoBatch: (kg) => dispatch({ type: 'potato/addBatch', kg }),
        sellPotato: (item) => dispatch({ type: 'potato/sell', item }),
        setPotatoManual: (slot, value) =>
          dispatch({ type: 'potato/manualSet', slot, value }),
        confirmPotatoManual: (slot) =>
          dispatch({ type: 'potato/manualConfirm', slot, by: state.session.email || '' }),
        unconfirmPotatoManual: (slot) =>
          dispatch({ type: 'potato/manualUnconfirm', slot, isAdmin: state.session.isAdmin }),
        adjustCake: (name, delta) =>
          dispatch({ type: 'cakes/adjust', name, delta }),
        setCakeInventory: (name, value) =>
          dispatch({ type: 'cakes/setInventory', name, value }),
        addCake: (name, quantity = 1) =>
          dispatch({ type: 'cakes/add', name, quantity }),
        sellCake: (name, quantity = 1) =>
          dispatch({ type: 'cakes/sell', name, quantity }),
        setCakeManual: (slot, value) =>
          dispatch({ type: 'cakes/manualSet', slot, value }),
        confirmCakeManual: (slot) =>
          dispatch({ type: 'cakes/manualConfirm', slot, by: state.session.email || '' }),
        unconfirmCakeManual: (slot) =>
          dispatch({ type: 'cakes/manualUnconfirm', slot, isAdmin: state.session.isAdmin }),
        submitLunch: ({ email, item }) =>
          dispatch({ type: 'lunch/submit', email, item }),
        addWaste: (entry) => dispatch({ type: 'waste/add', entry }),
        addBoardOrder: (entry) => dispatch({ type: 'board/add', entry }),
      },
    }
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
