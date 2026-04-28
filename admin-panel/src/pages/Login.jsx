import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '../data/countryCodes'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()

  // Step 1: phone number
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [localNumber, setLocalNumber] = useState('')
  const [step, setStep] = useState(1)

  // Country dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  // Step 2: OTP
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // E.164 from parts: strip leading zeros from local number
  const getE164 = () => {
    const num = localNumber.replace(/\D/g, '').replace(/^0+/, '')
    return `${country.dial}${num}`
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [dropdownOpen])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // Auto-submit when all digits filled
  useEffect(() => {
    if (step === 2 && digits.every(d => d !== '')) {
      handleVerify(digits.join(''))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, step])

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.iso.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const sendOtp = useCallback(async () => {
    setError(''); setInfo(''); setLoading(true)
    const phone = getE164()
    try {
      await requestOtp(phone)
      setStep(2)
      setDigits(Array(OTP_LENGTH).fill(''))
      setCountdown(RESEND_COOLDOWN)
      setInfo(`OTP sent via SMS to ${phone}`)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ')
        : (detail || err.message || 'Failed to send OTP')
      setError(msg)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, localNumber, requestOtp])

  const handleVerify = async (otp) => {
    if (loading) return
    setError(''); setLoading(true)
    const phone = getE164()
    try {
      await verifyOtp(phone, otp)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ')
        : (detail || err.message || 'Invalid OTP')
      setError(msg)
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]; next[index] = ''; setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        const next = [...digits]; next[index - 1] = ''; setDigits(next)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const canSend = localNumber.replace(/\D/g, '').length >= 4

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-3xl mb-4">
            🧠
          </div>
          <h1 className="text-xl font-bold text-white">FocusMind Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Secure OTP Authentication</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? 'bg-violet-600 text-white' :
                  step > s  ? 'bg-emerald-600 text-white' :
                  'bg-slate-700 text-slate-500'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-xs ${step === s ? 'text-slate-200' : 'text-slate-600'}`}>
                  {s === 1 ? 'Mobile number' : 'Verify OTP'}
                </span>
                {s < 2 && <div className={`flex-1 h-px w-8 ${step > s ? 'bg-emerald-600' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {/* Error / info banners */}
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {info && !error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">📱</span>
              <span>{info}</span>
            </div>
          )}

          {/* ── Step 1: Phone number ── */}
          {step === 1 && (
            <form onSubmit={e => { e.preventDefault(); if (canSend) sendOtp() }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Admin Mobile Number
                </label>

                <div className="flex gap-2">
                  {/* Country code dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(o => !o)}
                      className="h-10 px-2.5 flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm hover:border-violet-500/50 transition-colors whitespace-nowrap min-w-[90px]"
                    >
                      <span className="text-base leading-none">{country.flag}</span>
                      <span className="text-slate-300 text-xs font-mono">{country.dial}</span>
                      <span className="text-slate-600 text-xs">▾</span>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-slate-800">
                          <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search country…"
                            value={countrySearch}
                            onChange={e => setCountrySearch(e.target.value)}
                            className="w-full bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-violet-500 placeholder-slate-600"
                          />
                        </div>
                        {/* List */}
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {filteredCountries.length === 0 && (
                            <li className="px-3 py-2 text-slate-500 text-sm text-center">No results</li>
                          )}
                          {filteredCountries.map(c => (
                            <li key={c.iso}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCountry(c)
                                  setDropdownOpen(false)
                                  setCountrySearch('')
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-800 transition-colors text-left ${
                                  country.iso === c.iso ? 'bg-violet-600/20 text-violet-300' : 'text-slate-200'
                                }`}
                              >
                                <span className="text-base w-5 text-center leading-none">{c.flag}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-slate-500 font-mono text-xs">{c.dial}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Phone number input */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="input flex-1"
                    placeholder="Phone number"
                    value={localNumber}
                    onChange={e => {
                      setLocalNumber(e.target.value.replace(/[^\d\s\-()]/g, ''))
                      setError('')
                    }}
                    autoFocus
                    autoComplete="tel-national"
                  />
                </div>

                {localNumber && (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Will send to: <span className="text-slate-400 font-mono">{getE164()}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !canSend}
                className="btn-primary w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  : <><span>📲</span> Send OTP via SMS</>
                }
              </button>
            </form>
          )}

          {/* ── Step 2: OTP entry ── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-xs text-slate-400 text-center">
                Enter the 6-digit code sent to{' '}
                <span className="text-slate-200 font-mono">{getE164()}</span>
              </p>

              {/* OTP digit boxes */}
              <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-slate-900 transition-all outline-none select-all
                      ${digit
                        ? 'border-violet-500 text-violet-300 shadow-[0_0_0_3px_rgba(124,58,237,0.15)]'
                        : 'border-slate-700 text-white focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]'
                      }
                      ${loading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                  />
                ))}
              </div>

              {/* Verify button */}
              <button
                onClick={() => handleVerify(digits.join(''))}
                disabled={loading || digits.some(d => !d)}
                className="btn-primary w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  : <><span>🔐</span> Verify &amp; Sign in</>
                }
              </button>

              {/* Resend + back */}
              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep(1); setError(''); setInfo(''); setDigits(Array(OTP_LENGTH).fill('')) }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Change number
                </button>
                <button
                  onClick={() => sendOtp()}
                  disabled={countdown > 0 || loading}
                  className="text-violet-400 hover:text-violet-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          OTP valid for 10 minutes · max 3 attempts
        </p>
      </div>
    </div>
  )
}
