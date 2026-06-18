import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, signUp as apiSignUp } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('token'))
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [expireAt, setExpireAt] = useState(() => {
    const stored = Number(localStorage.getItem('expireAt'))
    return stored > 0 ? stored : null
  })

  // parse JWT payload
  const parseJwt = t => {
    try { return JSON.parse(atob(t.split('.')[1])) } catch { return null }
  }

  // sub é o UUID do usuário; username vem do formulário de login
  const saveSession = (accessToken, expiresIn, username) => {
    const expireAtMs = Date.now() + expiresIn * 1000
    localStorage.setItem('token', accessToken)
    localStorage.setItem('expireAt', String(expireAtMs))
    const payload = parseJwt(accessToken)
    const userData = { id: payload?.sub, username, scope: payload?.scope }
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
    setExpireAt(expireAtMs)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('expireAt')
    setToken(null)
    setUser(null)
    setExpireAt(null)
  }, [])

  // Auto-logout when token expires
  useEffect(() => {
    if (!expireAt) return
    const ms = expireAt - Date.now()
    if (ms <= 0) { logout(); return }
    const t = setTimeout(logout, ms)
    return () => clearTimeout(t)
  }, [expireAt, logout])

  const login = async ({ username, password }) => {
    const res = await apiLogin({ username, password })
    saveSession(res.data.accessToken, res.data.expiresIn, username)
    return res.data
  }

  const register = async ({ username, password }) => {
    await apiSignUp({ username, password })
    return login({ username, password })
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
