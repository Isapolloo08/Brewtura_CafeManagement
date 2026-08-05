import React, { useState } from 'react';
import brandLogo from '../assets/Brewtura_Logo.png';

export function LoginModal({ onLogin, isOpen }) {
  const [activeMode, setActiveMode] = useState('credentials'); // 'credentials' or 'pin'
  const [employeeId, setEmployeeId] = useState('ADM-001');
  const [password, setPassword] = useState('••••••••');
  const [pin, setPin] = useState(['', '', '', '']);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState('Administrator');
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({
      id: 'emp-101',
      name: employeeId === 'ADM-001' ? 'Marco V.' : 'Elena Rossi',
      role: selectedRole,
      employeeId: employeeId,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    });
  };

  const handlePinInput = (val, index) => {
    const newPin = [...pin];
    newPin[index] = val.slice(-1);
    setPin(newPin);

    // Auto move focus to next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    if (index === 3 && val) {
      setTimeout(() => {
        onLogin({
          id: 'emp-101',
          name: 'Marco V.',
          role: selectedRole,
          employeeId: 'ADM-001',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        });
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F5E6D3] animate-fadeIn overflow-y-auto">
      {/* Rich Coffee Shop Atmosphere Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.7] contrast-[1.05]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1920&q=80')`
        }}
      />

      {/* Glassmorphic Overlay Blur & Warm Ambient Glows */}
      <div className="absolute inset-0 bg-[#3C2A21]/30 backdrop-blur-md" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#C08552]/30 rounded-full blur-[120px] animate-ambient" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-[#3C2A21]/50 rounded-full blur-[120px] animate-ambient" />
      </div>

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-5 sm:p-8 shadow-2xl border border-white/70 text-[#3C2A21]">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white shadow-xl shadow-amber-950/30 border border-amber-400/30 mb-4 overflow-hidden">
            <img src={brandLogo} alt="Brewtura" className="w-20 h-20 object-contain" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Brewtura</h2>
          <p className="text-xs text-amber-900/60 font-semibold tracking-wider uppercase mt-0.5">Desktop Management Terminal</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-amber-900/10 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveMode('credentials')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMode === 'credentials' ? 'bg-[#3C2A21] text-amber-100 shadow' : 'text-amber-900/70 hover:text-[#3C2A21]'
              }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('pin')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMode === 'pin' ? 'bg-[#3C2A21] text-amber-100 shadow' : 'text-amber-900/70 hover:text-[#3C2A21]'
              }`}
          >
            Quick PIN Login
          </button>
        </div>

        {/* Form Body */}
        {activeMode === 'credentials' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Employee ID or Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-amber-900/40">👤</span>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl glass-input font-medium text-[#3C2A21]"
                  placeholder="e.g. ADM-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-amber-900/40">🔒</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl glass-input font-medium text-[#3C2A21]"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Select Role Access</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
              >
                <option value="Administrator">Administrator (Full Access)</option>
                <option value="Manager">Manager (Operations & Reports)</option>
                <option value="Inventory Staff">Inventory Staff (Stock & POs)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-amber-900/30 text-[#C08552] focus:ring-[#C08552]"
                />
                <span className="font-semibold text-amber-900/70">Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotMsg(!showForgotMsg)}
                className="font-bold text-[#C08552] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {showForgotMsg && (
              <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-xl">
                ℹ️ For security, password resets must be issued by the Store Owner or Lead Administrator.
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-sm shadow-lg shadow-amber-950/30 hover:brightness-110 active:scale-95 transition-all mt-2"
            >
              Secure Login →
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-center py-2">
            <p className="text-xs text-amber-900/70 font-semibold">Enter your 4-digit quick staff access PIN:</p>

            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type="password"
                  maxLength={1}
                  value={pin[idx]}
                  onChange={(e) => handlePinInput(e.target.value, idx)}
                  className="w-12 h-14 text-center font-extrabold text-xl rounded-2xl glass-input text-[#3C2A21] border-[#C08552]/40 shadow-inner"
                />
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Target Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
              >
                <option value="Administrator">Administrator</option>
                <option value="Manager">Manager</option>
                <option value="Inventory Staff">Inventory Staff</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => onLogin({ id: 'emp-101', name: 'Marco V.', role: selectedRole, employeeId: 'ADM-001' })}
              className="w-full py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold hover:brightness-110 shadow-md"
            >
              Unlock Terminal
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center justify-between text-[11px] text-amber-900/50 font-medium">
          <span>System Online: Terminal V-4.21</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Encrypted 256-bit</span>
        </div>
      </div>
    </div>
  );
}
