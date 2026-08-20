import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { processAvatarImage } from '../utils/imageUtils.js';
import { Icons } from './Icons';
import {
  PageHeader,
  SectionCard,
  Field,
  PrimaryButton,
  SubtleButton,
  ErrorNote,
  CountPill,
  inputClass,
  toneOf,
} from './PageKit';

const ROLE_TONE = {
  admin: 'violet',
  manager: 'sky',
  cashier: 'emerald',
  barista: 'amber',
  stock_clerk: 'coffee',
};

const prettyRole = (raw) =>
  String(raw || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || '—';

const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/* ── Local glyphs (matching this file's inline-SVG style) ── */
const LockGlyph = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25v-6a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 12.75v6A2.25 2.25 0 0 0 6.75 21Z" />
  </svg>
);

const KeypadGlyph = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" />
  </svg>
);

const UploadGlyph = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const PersonGlyph = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

/* ── Avatar with graceful fallback ────────────────────────── */
function Avatar({ src, name, className = '', textClass = 'text-3xl', fallback }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (src && !broken) {
    return <img src={src} alt="" className={`w-full h-full object-cover ${className}`} onError={() => setBroken(true)} />;
  }
  if (fallback) return fallback;
  return <span className={`font-heading font-extrabold text-[#C08552] ${textClass}`}>{initialsOf(name)}</span>;
}

/* ── Toast ────────────────────────────────────────────────── */
function Toast({ message, type, onDone }) {
  /* onDone is a fresh closure each parent render; hold it in a ref so the
     dismiss timer isn't restarted every keystroke elsewhere on the page. */
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => doneRef.current?.(), 3600);
    return () => clearTimeout(t);
  }, []);

  const t = toneOf(type === 'success' ? 'emerald' : 'red');
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 right-6 z-[200] flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl glass-card border border-white/60 shadow-2xl shadow-[#3C2A21]/20 animate-scaleIn"
    >
      <span className={`w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={type === 'success' ? 'M4.5 12.75l6 6 9-13.5' : 'M6 18L18 6M6 6l12 12'}
          />
        </svg>
      </span>
      <p className="text-xs font-bold text-[#3C2A21] max-w-xs">{message}</p>
    </div>
  );
}

/* ── Text + password inputs ───────────────────────────────── */
function TextInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${inputClass} pr-16 ${className}`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide text-amber-900/45 hover:text-[#3C2A21] hover:bg-amber-900/10 transition-colors"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

/* ── Password strength ladder ─────────────────────────────── */
const STRENGTH = [
  { label: '', tone: 'red' },
  { label: 'Weak — add more characters', tone: 'red' },
  { label: 'Fair — add numbers & uppercase', tone: 'amber' },
  { label: 'Good — almost there', tone: 'sky' },
  { label: 'Strong password', tone: 'emerald' },
];

function SavingLabel({ saving, savingText, children }) {
  if (!saving) return children;
  return (
    <>
      <span className="w-3.5 h-3.5 border-2 border-amber-100 border-t-transparent rounded-full animate-spin" />
      {savingText}
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-3xl border border-white/60 h-44 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl border border-white/60 h-72 animate-pulse" />
          <div className="glass-card rounded-3xl border border-white/60 h-60 animate-pulse" />
        </div>
        <div className="glass-card rounded-3xl border border-white/60 h-80 animate-pulse" />
      </div>
    </div>
  );
}

export function ProfilePage({ currentUser, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);

  // Edit profile form state
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');  // base64 or existing URL
  const [avatarFile, setAvatarFile]   = useState(null);    // selected File object
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw]   = useState(false);
  const [pwError, setPwError]     = useState('');

  // PIN form state
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin]   = useState(false);
  const [pinError, setPinError]     = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  };

  useEffect(() => {
    setLoading(true);
    api.getMe()
      .then(data => {
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setAvatarPreview(data.avatar || '');
      })
      .catch(() => {
        if (currentUser) {
          setProfile(currentUser);
          setName(currentUser.name || '');
          setEmail(currentUser.email || '');
          setAvatarPreview(currentUser.avatar || currentUser.avatarUrl || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('That file is not an image', 'error');
    try {
      const processedUrl = await processAvatarImage(file, 512);
      setAvatarPreview(processedUrl);
      setAvatarFile(file);
    } catch (err) {
      console.warn('Image processing error:', err);
      showToast('Could not read that image — try another file', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Name cannot be empty', 'error');
    setSavingProfile(true);
    try {
      const updated = await api.updateMe({
        name: name.trim(),
        email: email.trim() || null,
        avatar: avatarPreview || null,
      });
      setProfile(prev => ({ ...prev, ...updated }));
      setAvatarFile(null);
      if (onProfileUpdate) {
        onProfileUpdate({ ...currentUser, name: updated.name, email: updated.email, avatar: updated.avatar });
      }
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6)   return setPwError('New password must be at least 6 characters.');
    if (newPw !== confirmPw) return setPwError('Passwords do not match.');
    setSavingPw(true);
    try {
      await api.updateMe({ password: newPw, currentPassword: currentPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password changed successfully!');
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    setPinError('');
    if (!/^\d{4,8}$/.test(newPin)) return setPinError('PIN must be 4–8 digits.');
    if (newPin !== confirmPin)     return setPinError('PINs do not match.');
    setSavingPin(true);
    try {
      await api.updateMe({ pin: newPin });
      setNewPin(''); setConfirmPin('');
      showToast('PIN updated successfully!');
    } catch (err) {
      setPinError(err.message || 'Failed to update PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const displayAvatar = avatarPreview || profile?.avatar || currentUser?.avatar || currentUser?.avatarUrl;
  const displayName = profile?.name || currentUser?.name || '—';
  const employeeId = profile?.employee_id || currentUser?.employeeId;
  const roleKey   = (profile?.role || currentUser?.role || '').toLowerCase().replace(' ', '_');
  const roleLabel = prettyRole(profile?.role || currentUser?.role);
  const roleTone  = toneOf(ROLE_TONE[roleKey] || 'coffee');
  const isActive  = profile?.is_active !== false;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const pwStrength = Math.min(4, [
    newPw.length >= 6,
    newPw.length >= 10,
    /[A-Z]/.test(newPw) && /[0-9]/.test(newPw),
    /[^A-Za-z0-9]/.test(newPw),
  ].filter(Boolean).length);

  const profileDirty =
    name !== (profile?.name || '') ||
    email !== (profile?.email || '') ||
    avatarPreview !== (profile?.avatar || '');

  const clearAvatar = () => {
    setAvatarPreview('');
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const accountRows = [
    { label: 'Role', value: roleLabel },
    { label: 'Employee ID', value: employeeId || '—' },
    { label: 'Branch', value: profile?.branch_name || '—' },
    { label: 'Member Since', value: memberSince },
    {
      label: 'Last Updated',
      value: profile?.updated_at
        ? new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {toast && (
        <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle="Manage your personal details and account security."
        icon={<Icons.User className="w-5 h-5" />}
      >
        <span
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${roleTone.soft} ${roleTone.ring} ${roleTone.text} text-[11px] font-extrabold uppercase tracking-wide`}
        >
          <span className={`w-2 h-2 rounded-full ${roleTone.dot}`} />
          {roleLabel}
        </span>
      </PageHeader>

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {/* Identity hero */}
          <div className="glass-card rounded-3xl border border-white/60 overflow-hidden">
            <div className="relative px-6 py-5 bg-gradient-to-r from-[#3C2A21] via-[#693F27] to-[#C08552]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 right-6 w-56 h-56 rounded-full bg-white/10 blur-2xl"
              />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0 mx-auto sm:mx-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white/70 shadow-xl shadow-[#2A1B15]/40 bg-[#F5E6D3] flex items-center justify-center">
                    <Avatar src={displayAvatar} name={displayName} textClass="text-2xl" />
                  </div>
                  <span
                    title={isActive ? 'Active' : 'Inactive'}
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow ${
                      isActive ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h3 className="font-heading font-extrabold text-xl text-white truncate">{displayName}</h3>
                  <p className="text-xs text-amber-100/80 font-semibold truncate mt-1">
                    {profile?.email || currentUser?.email || 'No email set'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 mx-auto sm:mx-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FFFDF9]/95 hover:bg-white border border-white/70 text-[#3C2A21] text-xs font-bold shadow-md shadow-[#2A1B15]/20 active:scale-[0.98] transition-all"
                >
                  <Icons.Camera className="w-4 h-4" /> Change Photo
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-amber-900/10 bg-amber-900/[0.03]">
              {employeeId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900/[0.07] border border-amber-900/10 text-[10px] font-extrabold text-[#693F27]">
                  <Icons.IdCard className="w-3 h-3" /> {employeeId}
                </span>
              )}
              {profile?.branch_name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/12 border border-sky-500/25 text-[10px] font-extrabold text-sky-800">
                  <Icons.CoffeeCup className="w-3 h-3" /> {profile.branch_name}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                  isActive
                    ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-800'
                    : 'bg-zinc-500/12 border-zinc-500/25 text-zinc-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                {isActive ? 'Active account' : 'Inactive account'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900/[0.04] border border-amber-900/[0.08] text-[10px] font-bold text-amber-900/50">
                Member since {memberSince}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── Editable settings ── */}
            <div className="lg:col-span-2 space-y-6">
              <SectionCard
                icon={<Icons.User className="w-4 h-4" />}
                title="Personal Details"
                hint="Shown across the terminal"
                actions={profileDirty ? <CountPill tone="amber">Unsaved changes</CountPill> : null}
              >
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" hint="This name appears throughout the system">
                      <TextInput
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Marco Villanueva"
                      />
                    </Field>
                    <Field label="Email Address" hint="Used for login and notifications">
                      <TextInput
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. marco@brewtura.com"
                      />
                    </Field>
                  </div>

                  <Field label="Profile Photo" hint="JPG, PNG, GIF or WebP — cropped and resized to 512px automatically">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={e => handleAvatarFile(e.target.files?.[0])}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); handleAvatarFile(e.dataTransfer.files?.[0]); }}
                      className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none focus:outline-none focus:ring-2 focus:ring-[#C08552]/45 ${
                        dragOver
                          ? 'border-[#C08552] bg-[#C08552]/10'
                          : 'border-amber-900/20 bg-amber-900/[0.03] hover:border-[#C08552]/60 hover:bg-amber-900/[0.06]'
                      }`}
                    >
                      <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden ring-2 ring-white shadow-sm bg-[#F5E6D3] flex items-center justify-center">
                        <Avatar
                          src={avatarPreview}
                          name={displayName}
                          fallback={<PersonGlyph className="w-5 h-5 text-amber-900/30" />}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {avatarFile ? (
                          <>
                            <p className="text-xs font-bold text-[#3C2A21] truncate">{avatarFile.name}</p>
                            <p className="text-[10px] text-amber-900/50 font-semibold mt-0.5 tabular-nums">
                              {(avatarFile.size / 1024).toFixed(1)} KB · ready to save
                            </p>
                          </>
                        ) : avatarPreview ? (
                          <>
                            <p className="text-xs font-bold text-[#3C2A21]">Current photo</p>
                            <p className="text-[10px] text-amber-900/50 font-semibold mt-0.5">Click or drag an image to replace</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-[#3C2A21]">Upload a profile photo</p>
                            <p className="text-[10px] text-amber-900/50 font-semibold mt-0.5">Click to browse, or drop an image here</p>
                          </>
                        )}
                      </div>

                      <span className="w-8 h-8 shrink-0 rounded-xl bg-amber-900/[0.07] border border-amber-900/10 flex items-center justify-center text-amber-900/40 group-hover:text-[#693F27] transition-colors">
                        <UploadGlyph />
                      </span>
                    </div>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={clearAvatar}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-red-500/70 hover:text-red-600 transition-colors"
                      >
                        <Icons.Trash className="w-3 h-3" /> Remove photo
                      </button>
                    )}
                  </Field>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t border-amber-900/[0.07]">
                    {profileDirty && (
                      <SubtleButton
                        type="button"
                        onClick={() => {
                          setName(profile?.name || '');
                          setEmail(profile?.email || '');
                          setAvatarPreview(profile?.avatar || '');
                          setAvatarFile(null);
                        }}
                        className="!py-2.5"
                      >
                        Discard
                      </SubtleButton>
                    )}
                    <PrimaryButton
                      type="submit"
                      disabled={savingProfile || !profileDirty}
                      className="!px-6 !py-2.5"
                    >
                      <SavingLabel saving={savingProfile} savingText="Saving…">Save Changes</SavingLabel>
                    </PrimaryButton>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                icon={<LockGlyph />}
                title="Change Password"
                hint="Minimum 6 characters"
              >
                <form onSubmit={handleSavePassword} className="space-y-5">
                  <Field label="Current Password">
                    <PasswordInput
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="New Password">
                      <PasswordInput
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Confirm New Password">
                      <PasswordInput
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>

                  {newPw && (
                    <div className="p-3.5 rounded-2xl bg-amber-900/[0.04] border border-amber-900/[0.08] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-extrabold text-amber-900/45 uppercase tracking-[0.1em]">
                          Password strength
                        </span>
                        <span className={`text-[10px] font-extrabold ${toneOf(STRENGTH[pwStrength].tone).text}`}>
                          {STRENGTH[pwStrength].label}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(lvl => (
                          <div
                            key={lvl}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              lvl <= pwStrength
                                ? `bg-gradient-to-r ${toneOf(STRENGTH[pwStrength].tone).bar}`
                                : 'bg-amber-900/10'
                            }`}
                          />
                        ))}
                      </div>
                      {confirmPw && (
                        <p
                          className={`text-[10px] font-extrabold ${
                            newPw === confirmPw ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {newPw === confirmPw ? '✓ Passwords match' : '✕ Passwords do not match yet'}
                        </p>
                      )}
                    </div>
                  )}

                  <ErrorNote>{pwError}</ErrorNote>

                  <div className="flex justify-end pt-4 border-t border-amber-900/[0.07]">
                    <PrimaryButton
                      type="submit"
                      disabled={savingPw || !currentPw || !newPw || !confirmPw}
                      className="!px-6 !py-2.5"
                    >
                      <SavingLabel saving={savingPw} savingText="Updating…">Update Password</SavingLabel>
                    </PrimaryButton>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                icon={<KeypadGlyph />}
                title="Change PIN"
                hint="Used for quick shift clock-in"
              >
                <form onSubmit={handleSavePin} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="New PIN" hint="Digits only — 4 to 8 characters">
                      <PasswordInput
                        inputMode="numeric"
                        maxLength={8}
                        value={newPin}
                        onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                        placeholder="e.g. 1234"
                        autoComplete="new-password"
                        className="tracking-[0.35em]"
                      />
                    </Field>
                    <Field label="Confirm PIN">
                      <PasswordInput
                        inputMode="numeric"
                        maxLength={8}
                        value={confirmPin}
                        onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                        placeholder="Re-enter PIN"
                        autoComplete="new-password"
                        className="tracking-[0.35em]"
                      />
                    </Field>
                  </div>

                  <ErrorNote>{pinError}</ErrorNote>

                  <div className="flex justify-end pt-4 border-t border-amber-900/[0.07]">
                    <PrimaryButton
                      type="submit"
                      disabled={savingPin || !newPin || !confirmPin}
                      className="!px-6 !py-2.5"
                    >
                      <SavingLabel saving={savingPin} savingText="Updating…">Update PIN</SavingLabel>
                    </PrimaryButton>
                  </div>
                </form>
              </SectionCard>
            </div>

            {/* ── Read-only rail ── */}
            <div className="lg:sticky lg:top-6">
              <SectionCard icon={<Icons.IdCard className="w-4 h-4" />} title="Account Information">
                <dl className="divide-y divide-amber-900/[0.07]">
                  {accountRows.map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                      <dt className="text-[10px] font-extrabold text-amber-900/40 uppercase tracking-[0.1em] pt-0.5 shrink-0">
                        {label}
                      </dt>
                      <dd className="text-xs font-bold text-[#3C2A21] text-right min-w-0 break-words">{value}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-[10px] font-extrabold text-amber-900/40 uppercase tracking-[0.1em] shrink-0">
                      Status
                    </dt>
                    <dd>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wide ${
                          isActive
                            ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-800'
                            : 'bg-red-500/10 border-red-500/25 text-red-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 pt-4 border-t border-amber-900/[0.07] text-[10px] text-amber-900/45 font-semibold leading-relaxed">
                  Role and branch assignment are managed by an administrator. Contact one to request a change.
                </p>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
