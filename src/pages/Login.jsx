import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionButton from '../components/ActionButton.jsx'
import Card from '../components/Card.jsx'
import { useAppStore } from '../state/appStore.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { actions } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return username.trim().length > 1 && password.trim().length > 0
  }, [username, password])

  return (
    <div className="min-h-full bg-gradient-to-br from-amber-100 via-neutral-100 to-rose-100">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full"
        >
          <Card className="p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-neutral-500">
                Kuhinjski dnevnik
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-neutral-900">
                {mode === 'signup' ? 'Registracija' : 'Prijava'}
              </div>
              <div className="mt-1 text-sm text-neutral-600">
                Prijava prek Supabase.
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className={[
                    'h-12 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition-all duration-200',
                    mode === 'signin'
                      ? 'bg-amber-500 text-white ring-amber-600/30 shadow-lg shadow-amber-500/20'
                      : 'bg-white/95 text-neutral-900 ring-neutral-200 shadow-lg shadow-neutral-900/5 active:bg-neutral-50',
                  ].join(' ')}
                  onClick={() => {
                    setMode('signin')
                    setError('')
                  }}
                >
                  Prijava
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className={[
                    'h-12 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition-all duration-200',
                    mode === 'signup'
                      ? 'bg-amber-500 text-white ring-amber-600/30 shadow-lg shadow-amber-500/20'
                      : 'bg-white/95 text-neutral-900 ring-neutral-200 shadow-lg shadow-neutral-900/5 active:bg-neutral-50',
                  ].join(' ')}
                  onClick={() => {
                    setMode('signup')
                    setError('')
                  }}
                >
                  Registracija
                </motion.button>
              </div>

              <label className="block">
                <div className="mb-1 text-sm font-semibold text-neutral-700">
                  Uporabniško ime
                </div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="npr. dejan"
                  className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-semibold text-neutral-700">
                  Geslo
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="h-14 w-full rounded-2xl bg-neutral-50 px-4 text-base text-neutral-900 shadow-inner shadow-neutral-900/5 ring-1 ring-neutral-200 outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400"
                />
              </label>

              {error ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              ) : null}

              <ActionButton
                disabled={!canSubmit}
                className={[
                  'mt-2',
                  !canSubmit ? 'opacity-60 shadow-none' : '',
                ].join(' ')}
                onClick={async () => {
                  setError('')
                  if (!canSubmit) {
                    setError('Vpiši uporabniško ime in geslo.')
                    return
                  }
                  const res = await actions.login({
                    username,
                    password,
                    mode: mode === 'signup' ? 'signup' : 'signin',
                  })
                  if (!res || res.ok !== true) {
                    setError(res?.message || 'Napaka pri prijavi.')
                    return
                  }
                  navigate('/dashboard', { replace: true })
                }}
              >
                <motion.span
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {mode === 'signup' ? 'Registracija →' : 'Prijava →'}
                </motion.span>
              </ActionButton>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
