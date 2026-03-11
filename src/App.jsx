import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Admin from './pages/Admin.jsx'
import Cakes from './pages/Cakes.jsx'
import Coffee from './pages/Coffee.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DejanOrders from './pages/DejanOrders.jsx'
import Login from './pages/Login.jsx'
import Lunch from './pages/Lunch.jsx'
import Pizza from './pages/Pizza.jsx'
import Potato from './pages/Potato.jsx'
import Waste from './pages/Waste.jsx'
import { useAppStore } from './state/appStore.jsx'

const pageTransition = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)' },
}

function Page({ children }) {
  return (
    <motion.div
      className="h-full"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function RequireAuth({ children }) {
  const { session } = useAppStore()
  if (!session.loggedIn) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { session } = useAppStore()
  if (!session.isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function LoginGate() {
  const { session } = useAppStore()
  if (session.loggedIn) return <Navigate to="/dashboard" replace />
  return <Login />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <Page>
              <LoginGate />
            </Page>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Page>
                <Dashboard />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/pizza"
          element={
            <RequireAuth>
              <Page>
                <Pizza />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/potato"
          element={
            <RequireAuth>
              <Page>
                <Potato />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/cakes"
          element={
            <RequireAuth>
              <Page>
                <Cakes />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/coffee"
          element={
            <RequireAuth>
              <Page>
                <Coffee />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/lunch"
          element={
            <RequireAuth>
              <Page>
                <Lunch />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/waste"
          element={
            <RequireAuth>
              <Page>
                <Waste />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/dejan-orders"
          element={
            <RequireAuth>
              <Page>
                <DejanOrders />
              </Page>
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <Page>
                  <Admin />
                </Page>
              </RequireAdmin>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
