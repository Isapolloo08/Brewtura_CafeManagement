import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import brandLogo from '../assets/Brewtura_Logo.png';

const USERS = [
  { employeeId: 'ADM-001', password: 'admin123', pin: '1234', name: 'Marco V.', role: 'Administrator', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { employeeId: 'MGR-002', password: 'manager1', pin: '5678', name: 'Elena R.', role: 'Manager', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { employeeId: 'INV-003', password: 'staff123', pin: '9012', name: 'Jonas P.', role: 'Inventory Staff', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' },
];

const ROLE_COLORS = {
  'Administrator': 'bg-purple-500/15 text-purple-700 border-purple-300/30',
  'Manager': 'bg-blue-500/15 text-blue-700 border-blue-300/30',
  'Inventory Staff': 'bg-amber-500/15 text-amber-800 border-amber-300/30',
};

const RoleIcon = ({ role, className = "w-3.5 h-3.5" }) => {
  if (role === 'Administrator') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
  if (role === 'Manager') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
};

export function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('credentials'); // 'credentials' | 'pin'
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isMaximized().then(setIsMaximized);
    window.electronAPI.onMaximizedChange(setIsMaximized);
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  const handleCredLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = employeeId.includes('@')
        ? { email: employeeId, password }
        : { employeeId: employeeId.trim().toUpperCase(), password };

      const res = await api.login(payload);
      localStorage.setItem('coffee_token', res.token);
      onLogin({
        id: res.user.id,
        name: res.user.name,
        role: res.user.role === 'admin' ? 'Administrator' : res.user.role === 'manager' ? 'Manager' : 'Staff',
        email: res.user.email
      });
    } catch (err) {
      console.error('API Login Error:', err);
      // Fallback for offline demo if server is not connected yet
      const user = USERS.find(u => u.employeeId === employeeId.toUpperCase() && u.password === password);
      if (user) {
        onLogin({ id: `emp-${Date.now()}`, name: user.name, role: user.role, employeeId: user.employeeId, avatar: user.avatar });
      } else {
        setError(err.message || 'Invalid Credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = async (val, index) => {
    const newPin = [...pin];
    newPin[index] = val.replace(/\D/g, '').slice(-1);
    setPin(newPin);
    setError('');

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
          localStorage.setItem('coffee_token', res.token);
          onLogin({
            id: res.user.id,
            name: res.user.name,
            role: res.user.role === 'admin' ? 'Administrator' : res.user.role === 'manager' ? 'Manager' : 'Staff'
          });
        } catch (err) {
          console.error('PIN Login API Error:', err);
          const user = USERS.find(u => u.pin === fullPin);
          if (user) {
            onLogin({ id: `emp-${Date.now()}`, name: user.name, role: user.role, employeeId: user.employeeId, avatar: user.avatar });
          } else {
            setError(err.message || 'Incorrect PIN. Please try again.');
            setPin(['', '', '', '']);
            document.getElementById('pin-0')?.focus();
          }
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

  const quickLogin = (user) => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin({ id: `emp-${Date.now()}`, name: user.name, role: user.role, employeeId: user.employeeId, avatar: user.avatar });
      setIsLoading(false);
    }, 500);
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
        {/* Background Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&q=80')` }}
        />
        {/* Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2A1B15]/85 via-[#3C2A21]/60 to-[#2A1B15]/40" />

        {/* Ambient Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C08552]/20 rounded-full blur-[100px] animate-ambient" />
          <div className="absolute bottom-1/3 right-0 w-[350px] h-[350px] bg-[#693F27]/25 rounded-full blur-[100px] animate-ambient-delay" />
        </div>

        {/* Content */}
        <div className="relative z-10 animate-slideInLeft">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-amber-950/40 border border-amber-400/30 overflow-hidden">
              <img src={brandLogo} alt="Brewtura" className="w-16 h-16 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-xl text-amber-100 leading-tight tracking-tight">Brewtura</h1>
              <p className="text-[11px] font-semibold text-amber-300/60 uppercase tracking-widest mt-0.5">Management System</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-12">
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
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-amber-100/75 text-xs font-semibold">
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
        <div className="relative z-10 animate-slideInLeft">
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
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-amber-950/10 border border-white/60">
            <div className="mb-7">
              <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Welcome back</h2>
              <p className="text-xs text-amber-900/55 font-medium mt-1">Sign in to your management terminal</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-[#F5E6D3]/80 p-1 rounded-xl mb-6 gap-1">
              {['credentials', 'pin'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${mode === m
                    ? 'bg-[#3C2A21] text-amber-100 shadow-md'
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
                    onClick={() => setShowForgot(!showForgot)}
                    className="text-xs font-bold text-[#C08552] hover:text-[#693F27] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {showForgot && (
                  <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-xl animate-fadeIn font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <span>Contact your Store Owner or Lead Administrator to reset your password.</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold">
                    <svg className="w-4 h-4 shrink-0 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/25 hover:brightness-110 active:scale-[0.98] transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
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

                <div className="flex justify-center gap-3">
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
                      className="w-14 h-16 text-center font-extrabold text-2xl rounded-2xl glass-input text-[#3C2A21] shadow-inner focus:scale-105 transition-transform"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {error && (
                  <div className="p-3 text-xs bg-red-500/10 border border-red-400/20 text-red-700 rounded-xl animate-fadeIn font-semibold text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setPin(['', '', '', '']); setError(''); document.getElementById('pin-0')?.focus(); }}
                  className="w-full py-2 rounded-xl border border-amber-900/15 text-xs font-bold text-amber-900/60 hover:bg-amber-900/5 transition-colors"
                >
                  Clear PIN
                </button>
              </div>
            )}

            {/* Quick Access Demo Accounts */}
            <div className="mt-7 pt-6 border-t border-amber-900/10">
              <p className="text-[11px] font-extrabold text-amber-900/40 uppercase tracking-widest mb-3">Quick Demo Access</p>
              <div className="space-y-2">
                {USERS.map((u) => (
                  <button
                    key={u.employeeId}
                    type="button"
                    onClick={() => quickLogin(u)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-900/8 border border-transparent hover:border-amber-900/10 transition-all group disabled:opacity-50"
                  >
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-[#C08552]/30" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-bold text-[#3C2A21] truncate">{u.name}</p>
                      <p className="text-[10px] text-amber-900/50 font-medium">{u.employeeId}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${ROLE_COLORS[u.role]}`}>
                      <RoleIcon role={u.role} /> {u.role}
                    </span>
                  </button>
                ))}
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
