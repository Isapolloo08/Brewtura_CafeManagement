import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import brandLogo from '../assets/Brewtura_Logo.png';

const HERO_BG = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&q=80';

// Re-adds an animation class so it replays on nodes that never unmount.
const replayAnim = (el, cls) => {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow
  el.classList.add(cls);
};

const clearShake = (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('animate-shake');
};

export function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('credentials'); // 'credentials' | 'pin'
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset' | 'done'
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [errorKey, setErrorKey] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(null);

  const cardRef = useRef(null);
  const pinRowRef = useRef(null);
  const bodyRef = useRef(null);
  const successTimer = useRef(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isMaximized().then(setIsMaximized);
    window.electronAPI.onMaximizedChange(setIsMaximized);
  }, []);

  // Preload the hero photo so it fades in instead of snapping over the dark panel.
  useEffect(() => {
    const img = new Image();
    const done = () => setBgLoaded(true);
    img.onload = done;
    img.onerror = done;
    img.src = HERO_BG;
  }, []);

  // Track the swappable card body so the card grows/shrinks smoothly between modes.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBodyHeight(el.offsetHeight));
    ro.observe(el);
    setBodyHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  // Flash the success state briefly before handing off to the app shell.
  const finishLogin = (res) => {
    localStorage.setItem('coffee_token', res.token);
    setLoginSuccess(true);
    successTimer.current = setTimeout(() => {
      onLogin({
        id: res.user.id,
        name: res.user.name,
        role: res.user.role === 'admin' ? 'Administrator' : res.user.role === 'manager' ? 'Manager' : 'Staff',
        email: res.user.email,
        avatar: res.user.avatar
      });
    }, 420);
  };

  const failLogin = (msg, shakeEl) => {
    setError(msg);
    setErrorKey((k) => k + 1);
    replayAnim(shakeEl, 'animate-shake');
  };

  const handleCredLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = employeeId.includes('@')
        ? { email: employeeId, password }
        : { employeeId: employeeId.trim().toUpperCase(), password };

      const res = await api.login(payload);
      finishLogin(res);
    } catch (err) {
      console.error('API Login Error:', err);
      failLogin(err.message || 'Invalid Credentials. Please try again.', cardRef.current);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = async (val, index) => {
    const newPin = [...pin];
    newPin[index] = val.replace(/\D/g, '').slice(-1);
    setPin(newPin);
    setError('');

    if (newPin[index]) replayAnim(document.getElementById(`pin-${index}`), 'animate-pin-pop');

    if (val && index < 3) {
      const next = document.getElementById(`pin-${index + 1}`);
      if (next) next.focus();
    }

    if (index === 3 && val) {
      const fullPin = [...newPin].join('');
      if (fullPin.length === 4) {
        setIsLoading(true);
        try {
          const res = await api.pinLogin({ pin: fullPin });
          finishLogin(res);
        } catch (err) {
          console.error('PIN Login API Error:', err);
          failLogin(err.message || 'Incorrect PIN. Please try again.', pinRowRef.current);
          setPin(['', '', '', '']);
          document.getElementById('pin-0')?.focus();
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newPin = [...pin];
      if (newPin[index]) {
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        const prev = document.getElementById(`pin-${index - 1}`);
        if (prev) prev.focus();
      }
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep('request');
    setForgotError('');
    setForgotMsg('');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('request');
    setForgotIdentifier('');
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotMsg('');
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    setForgotLoading(true);
    try {
      const payload = forgotIdentifier.includes('@')
        ? { email: forgotIdentifier.trim() }
        : { employeeId: forgotIdentifier.trim().toUpperCase() };
      const res = await api.forgotPassword(payload);
      setForgotMsg(res.message || 'A password reset code has been sent to your email.');
      setForgotStep('reset');
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.resetPassword({ code: forgotCode.trim(), password: newPassword });
      setForgotMsg(res.message || 'Your password has been reset. You can now sign in with your new password.');
      setForgotStep('done');
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password. Check your code and try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#2A1B15]">
      {/* Custom title bar drag region + window controls */}
      <div className="fixed top-0 left-0 right-0 h-8 z-50" style={{ WebkitAppRegion: 'drag' }} />
      <div className="fixed top-1 right-3 z-50 flex items-center gap-0.5 backdrop-blur-xl border-amber-900/10 px-1.5 py-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button onClick={handleMinimize} className="p-1.5 hover:bg-amber-900/10 rounded-lg text-[#3C2A21]/50 hover:text-[#3C2A21] transition-colors" aria-label="Minimize">
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="6" x2="10" y2="6" /></svg>
        </button>
        <button onClick={handleMaximize} className="p-1.5 hover:bg-amber-900/10 rounded-lg text-[#3C2A21]/50 hover:text-[#3C2A21] transition-colors" aria-label={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4.5" width="5" height="5" rx="0.5" />
              <path d="M4.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="8" height="8" rx="0.5" />
            </svg>
          )}
        </button>
        <button onClick={handleClose} className="p-1.5 hover:bg-red-500/10 rounded-lg text-[#3C2A21]/50 hover:text-red-600 transition-colors" aria-label="Close">
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </button>
      </div>

      {/* ── Left Panel: Branding & Ambiance ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background Photo — fades in once loaded, then drifts (Ken Burns) */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${bgLoaded ? 'opacity-100 animate-ken-burns' : 'opacity-0'}`}
          style={{ backgroundImage: `url('${HERO_BG}')` }}
        />
        {/* Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2A1B15]/85 via-[#3C2A21]/60 to-[#2A1B15]/40" />

        {/* Ambient Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C08552]/20 rounded-full blur-[100px] animate-ambient" />
          <div className="absolute bottom-1/3 right-0 w-[350px] h-[350px] bg-[#693F27]/25 rounded-full blur-[100px] animate-ambient-delay" />
        </div>

        {/* Content — children stagger in individually */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16 animate-slideInLeft">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-amber-950/40 border border-amber-400/30 overflow-hidden transition-transform duration-500 hover:scale-105 hover:-rotate-3">
              <img src={brandLogo} alt="Brewtura" className="w-16 h-16 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-xl text-amber-100 leading-tight tracking-tight">Brewtura</h1>
              <p className="text-[11px] font-semibold text-amber-300/60 uppercase tracking-widest mt-0.5">Management System</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-12 animate-slideInLeft" style={{ animationDelay: '130ms' }}>
            <h2 className="font-heading font-extrabold text-4xl xl:text-5xl text-white leading-tight mb-4">
              Your coffee shop,<br />
              <span className="text-[#C08552]">perfectly managed.</span>
            </h2>
            <p className="text-amber-100/60 text-sm leading-relaxed max-w-md font-medium">
              Complete control over your inventory, staff, menu, and operations — all in one elegant admin terminal designed for baristas who mean business.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3">
            {[
              { id: 'chart', label: 'Real-time Sales Dashboard' },
              { id: 'coffee', label: 'Menu & Recipe Management' },
              { id: 'box', label: 'Automated Inventory Tracking' },
              { id: 'people', label: 'Staff & Role Management' },
            ].map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-3 text-amber-100/75 text-xs font-semibold animate-slideInLeft transition-colors duration-200 hover:text-amber-100"
                style={{ animationDelay: `${320 + i * 90}ms` }}
              >
                {f.id === 'chart' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                )}
                {f.id === 'coffee' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 6.75h1.25a3.25 3.25 0 013.25 3.25v.5a3.25 3.25 0 01-3.25 3.25H18.5M3 6.75h15.5v7.25a4.25 4.25 0 01-4.25 4.25H7.25A4.25 4.25 0 013 14V6.75zM5.5 3v1.5M9.5 3v1.5M13.5 3v1.5" />
                  </svg>
                )}
                {f.id === 'box' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                )}
                {f.id === 'people' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                )}
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10 animate-slideInLeft" style={{ animationDelay: '820ms' }}>
          <p className="text-amber-100/40 text-xs italic font-medium">
            "Good coffee is a pleasure. Good management is a habit."
          </p>
          <p className="text-amber-100/25 text-[11px] mt-1">© 2025 Brewtura Admin System v4.2</p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#F5E6D3] relative">
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(192,133,82,0.12) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(60,42,33,0.08) 0%, transparent 40%)`
          }}
        />

        <div className="relative z-10 w-full max-w-[420px] animate-slideInRight">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-amber-400/30 overflow-hidden">
              <img src={brandLogo} alt="Brewtura" className="w-14 h-14 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-lg text-[#3C2A21]">Brewtura</h1>
              <p className="text-[11px] text-amber-900/50 uppercase tracking-widest font-semibold">Admin Terminal</p>
            </div>
          </div>

          {/* Form Card */}
          <div
            ref={cardRef}
            onAnimationEnd={clearShake}
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-amber-950/10 border border-white/60"
          >
            <div className="mb-7">
              <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Welcome back</h2>
              <p className="text-xs text-amber-900/55 font-medium mt-1">Sign in to your management terminal</p>
            </div>

            {/* Swappable body — height eases between login modes and reset steps */}
            <div
              className="transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ height: bodyHeight ?? 'auto' }}
            >
              <div ref={bodyRef}>

            {/* Mode Toggle */}
            {!showForgot && (
              <>
            <div className="relative flex bg-[#F5E6D3]/80 p-1 rounded-xl mb-6 gap-1">
              {/* Sliding active indicator */}
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.375rem)] rounded-lg bg-[#3C2A21] shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: mode === 'pin' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0)' }}
              />
              {['credentials', 'pin'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); }}
                  className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-lg transition-colors duration-200 ${mode === m
                    ? 'text-amber-100'
                    : 'text-amber-900/60 hover:text-[#3C2A21]'
                    }`}
                >
                  {m === 'credentials' ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Password Login
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h4v4H6V6zM14 6h4v4h-4V6zM6 14h4v4H6v-4zM14 14h4v4h-4v-4z" />
                      </svg>
                      Quick PIN
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Credentials Form ── */}
            {mode === 'credentials' && (
              <form onSubmit={handleCredLogin} className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    Employee ID
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-amber-900/40 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30"
                      placeholder="e.g. ADM-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-amber-900/40">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-3 flex items-center text-amber-900/40 hover:text-amber-900/70 transition-colors"
                    >
                      {showPass ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-amber-900/30 text-[#C08552] focus:ring-[#C08552] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-amber-900/70">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-xs font-bold text-[#C08552] hover:text-[#693F27] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div key={errorKey} className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold">
                    <svg className="w-4 h-4 shrink-0 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || loginSuccess}
                  className={`btn-sheen w-full py-3 rounded-xl text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/25 hover:brightness-110 active:scale-[0.98] transition-all duration-300 mt-1 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${loginSuccess
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                    : 'bg-gradient-to-r from-[#693F27] to-[#3C2A21] disabled:opacity-60'
                    }`}
                >
                  {loginSuccess ? (
                    <>
                      <svg className="w-4 h-4 animate-scaleIn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Welcome back!
                    </>
                  ) : isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing In...
                    </>
                  ) : (
                    'Sign In to Terminal →'
                  )}
                </button>
              </form>
            )}

            {/* ── PIN Form ── */}
            {mode === 'pin' && (
              <div className="space-y-6 animate-fadeIn">
                <p className="text-xs text-center text-amber-900/60 font-semibold">
                  Enter your 4-digit Staff Access PIN
                </p>

                <div ref={pinRowRef} onAnimationEnd={clearShake} className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`pin-${idx}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={pin[idx]}
                      onChange={(e) => handlePinInput(e.target.value, idx)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx)}
                      className={`w-14 h-16 text-center font-extrabold text-2xl rounded-2xl glass-input text-[#3C2A21] shadow-inner focus:scale-105 transition-transform ${pin[idx] ? 'pin-filled' : ''}`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {error && (
                  <div key={errorKey} className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                {loginSuccess ? (
                  <div className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-700 flex items-center justify-center gap-2 animate-fadeIn">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    PIN accepted — signing in
                  </div>
                ) : isLoading ? (
                  <div className="w-full py-2 rounded-xl border border-amber-900/15 text-xs font-bold text-amber-900/60 flex items-center justify-center gap-2 animate-fadeIn">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying PIN...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setPin(['', '', '', '']); setError(''); document.getElementById('pin-0')?.focus(); }}
                    className="w-full py-2 rounded-xl border border-amber-900/15 text-xs font-bold text-amber-900/60 hover:bg-amber-900/5 hover:border-amber-900/25 active:scale-[0.98] transition-all duration-200"
                  >
                    Clear PIN
                  </button>
                )}
              </div>
            )}
              </>
            )}

            {/* ── Forgot Password Flow ── */}
            {showForgot && (
              <div key={forgotStep} className="animate-fadeIn">
                {forgotStep === 'done' ? (
                  <div className="text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-scaleIn">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-amber-900/80">{forgotMsg}</p>
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="btn-sheen w-full py-3 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/25 hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="group text-xs font-bold text-[#C08552] hover:text-[#693F27] transition-colors flex items-center gap-1 mb-4"
                    >
                      <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                      Back to sign in
                    </button>

                    {forgotStep === 'request' ? (
                      <form onSubmit={handleForgotRequest} className="space-y-4">
                        <div>
                          <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Reset your password</h3>
                          <p className="text-xs text-amber-900/55 font-medium mt-1">
                            Enter your email or Employee ID and we'll send a 6-digit reset code.
                          </p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                            Email or Employee ID
                          </label>
                          <input
                            type="text"
                            required
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30"
                            placeholder="e.g. ADM-001 or email@domain.com"
                          />
                        </div>
                        {forgotMsg && (
                          <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl animate-fadeIn font-semibold">{forgotMsg}</div>
                        )}
                        {forgotError && (
                          <div className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold">{forgotError}</div>
                        )}
                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="btn-sheen w-full py-3 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {forgotLoading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending...
                            </>
                          ) : (
                            'Send Reset Code'
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                          <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Create a new password</h3>
                          <p className="text-xs text-amber-900/55 font-medium mt-1">
                            Enter the 6-digit code sent to your email along with your new password.
                          </p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                            Reset Code
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            inputMode="numeric"
                            value={forgotCode}
                            onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30 tracking-[0.3em] text-center"
                            placeholder="••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPass ? 'text' : 'password'}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30"
                              placeholder="At least 6 characters"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPass(!showNewPass)}
                              className="absolute inset-y-0 right-3 flex items-center text-amber-900/40 hover:text-amber-900/70 transition-colors"
                            >
                              {showNewPass ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                            Confirm Password
                          </label>
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30"
                            placeholder="Re-enter new password"
                          />
                        </div>
                        {forgotError && (
                          <div className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold">{forgotError}</div>
                        )}
                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="btn-sheen w-full py-3 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {forgotLoading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Resetting...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-amber-900/45 font-medium px-1">
            <span>Terminal v4.2.1 — Online</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              AES-256 Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
