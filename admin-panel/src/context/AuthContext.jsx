import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/admin'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(({ data }) => {
        if (!data.is_admin) { logout(); return }
        setUser(data)
        localStorage.setItem('admin_user', JSON.stringify(data))
      })
      .catch(logout)
      .finally(() => setLoading(false))
  }, [])

  const requestOtp = async (identifier) => {
    await authApi.requestOtp(identifier)
  }

  const verifyOtp = async (identifier, otp) => {
    const { data } = await authApi.verifyOtp(identifier, otp)
    if (!data.user.is_admin) throw new Error('Access denied: not an admin account')
    localStorage.setItem('admin_token', data.access_token)
    localStorage.setItem('admin_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, requestOtp, verifyOtp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
