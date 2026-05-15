import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import RecordsPage from './pages/RecordsPage'
import ArticlesPage from './pages/ArticlesPage'
import LoginPage from './pages/LoginPage'
import { getUser, logout } from './api'
import './App.css'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })()

  if (!token || !user) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const user = getUser()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <RequireAuth>
            <div className="app-shell">
              <nav className="sidebar">
                <div className="sidebar-brand">
                  <span className="brand-icon">⬡</span>
                  <div>
                    <div className="brand-name">SOPify</div>
                    <div className="brand-sub">v0.2 · {user?.role}</div>
                  </div>
                </div>

                <div className="nav-section-label">Workspace</div>
                <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <span className="nav-icon">↑</span> Upload
                </NavLink>
                <NavLink to="/records" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <span className="nav-icon">≡</span> Raw Records
                </NavLink>
                <NavLink to="/articles" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <span className="nav-icon">✦</span> Articles
                </NavLink>

                <div className="sidebar-footer">
                  <div className="user-info">
                    <div className="user-name">{user?.username}</div>
                    <div className="user-role">{user?.role}</div>
                  </div>
                  <button className="logout-btn" onClick={logout}>Sign out</button>
                </div>
              </nav>
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<UploadPage />} />
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/articles" element={<ArticlesPage />} />
                </Routes>
              </main>
            </div>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  )
}