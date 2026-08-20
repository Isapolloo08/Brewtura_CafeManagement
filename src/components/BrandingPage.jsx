import React, { useRef, useState } from 'react';
import { Icons } from './Icons';
import { LogoEditorModal } from './LogoEditorModal';

export function BrandingPage({ settings, onUpdateSettings }) {
  const [form, setForm] = useState({
    storeName: settings?.storeName ?? '',
    logo: settings?.logo ?? '',
    logoShape: settings?.logoShape ?? 'circle',
    logoScale: settings?.logoScale ?? 1,
  });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [editorSrc, setEditorSrc] = useState(null);
  const fileInputRef = useRef(null);

  const LOGO_SHAPES = [
    { id: 'circle', label: 'Circle', icon: 'circle' },
    { id: 'rounded', label: 'Rounded', icon: 'rounded' },
    { id: 'square', label: 'Square', icon: 'square' },
  ];

  const shapeClass = (shape) =>
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'rounded'
        ? 'rounded-2xl'
        : 'rounded-none';

  const hasChanges = Object.keys(form).some(
    (k) => form[k] !== settings?.[k]
  );

  const openEditorForFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditorSrc(reader.result);
    reader.onerror = () => setMsg({ text: 'Failed to read the image file.', type: 'error' });
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoChange = (e) => {
    openEditorForFile(e.target.files?.[0]);
  };

  const handleEditLogo = () => {
    if (form.logo) setEditorSrc(form.logo);
  };

  const handleEditorApply = (dataUrl) => {
    setForm((p) => ({ ...p, logo: dataUrl }));
    setEditorSrc(null);
    setMsg({ text: 'Logo updated! Remember to save to apply changes.', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleRemoveLogo = () => {
    setForm((p) => ({ ...p, logo: '' }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({ ...settings, ...form });
    setMsg({ text: 'Store branding saved successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleReset = () => {
    setForm({
      storeName: settings?.storeName ?? '',
      logo: settings?.logo ?? '',
      logoShape: settings?.logoShape ?? 'circle',
      logoScale: settings?.logoScale ?? 1,
    });
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.CoffeeCup className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  Store Branding
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Customize your store name and logo. These appear across the cashier POS system, receipts, and reports.
                </p>
              </div>
            </div>

            {msg.text && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-xs font-extrabold animate-slideDown ${
                  msg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900'
                    : 'bg-red-500/10 border border-red-500/20 text-red-900'
                }`}
              >
                <Icons.Bell className="w-3.5 h-3.5 shrink-0" />
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.CoffeeCup className="w-3 h-3 text-[#C08552]/70" />
                  Store Name
                </label>
                <input
                  type="text"
                  value={form.storeName}
                  placeholder="e.g. Mama Timpla tayo kape"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, storeName: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21] placeholder:font-medium placeholder:text-[#3C2A21]/30 transition-shadow"
                />
                <p className="text-[10px] text-[#3C2A21]/45 font-medium mt-2">
                  PNG or JPG recommended. Large images are automatically resized. Removes automatically keep the original logo.
                </p>
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                  Logo Shape
                </label>
                <div className="flex gap-2">
                  {LOGO_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, logoShape: s.id }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        form.logoShape === s.id
                          ? 'bg-[#693F27] text-amber-100 border-[#693F27] shadow-md scale-[1.02]'
                          : 'bg-white/50 text-[#3C2A21]/70 border-[#C08552]/20 hover:bg-white/80'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 border-2 ${
                          form.logoShape === s.id ? 'border-amber-100/80' : 'border-[#3C2A21]/40'
                        } ${
                          s.icon === 'circle'
                            ? 'rounded-full'
                            : s.icon === 'rounded'
                              ? 'rounded-[5px]'
                              : ''
                        }`}
                      />
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#3C2A21]/45 font-medium mt-1">
                  How the logo is framed on the POS, login, shift close, and receipt.
                </p>
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Edit className="w-3 h-3 text-[#C08552]/70" />
                  Logo Size / Overflow
                </label>
                <div className="flex items-center gap-3 px-1">
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={10}
                    value={Math.round((form.logoScale ?? 1) * 100)}
                    onChange={(e) => setForm((p) => ({ ...p, logoScale: Number(e.target.value) / 100 }))}
                    className="flex-1 accent-[#693F27]"
                    title="Scale the logo larger than the shape frame so it overflows"
                  />
                  <span className="text-[11px] font-bold text-[#3C2A21]/70 w-10 text-right">
                    {Math.round((form.logoScale ?? 1) * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-[#3C2A21]/45 font-medium mt-1">
                  Over 100% enlarges the logo so it overflows the shape frame and gets clipped by it.
                </p>
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Camera className="w-3 h-3 text-[#C08552]/70" />
                  Store Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/60 border border-[#C08552]/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {form.logo ? (
                      <img src={form.logo} alt="Store Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Icons.CoffeeCup className="w-8 h-8 text-[#3C2A21]/25" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5E6D3] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/15 transition-all border border-amber-900/10 shadow-sm"
                    >
                      <Icons.Camera className="w-3.5 h-3.5" />
                      {form.logo ? 'Replace Logo' : 'Upload Logo'}
                    </button>
                    {form.logo && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleEditLogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-[#693F27] hover:bg-amber-900/10 transition-all"
                        >
                          <Icons.Edit className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-red-700 hover:bg-red-500/10 transition-all"
                        >
                          <Icons.Trash className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#3C2A21]/45 font-medium mt-2">
                  Upload your logo, then crop, rotate, flip, and add a background before saving.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-[#C08552]/10">
                <button
                  type="submit"
                  disabled={!hasChanges}
                  className={`px-6 py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all ${
                    hasChanges
                      ? 'bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 hover:brightness-110 active:scale-95 cursor-pointer'
                      : 'bg-[#3C2A21]/30 text-[#3C2A21]/40 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icons.Settings className="w-3.5 h-3.5" />
                    Save Branding
                  </span>
                </button>
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-3 rounded-2xl text-xs font-extrabold text-[#3C2A21]/60 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.Bell className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-[#3C2A21]">
                  Pro Tip
                </h4>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-1 leading-relaxed">
                  Your branding updates are saved to the shared database. Cashier POS terminals pick them up after the next login or reload — no reinstallation needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C08552]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.CoffeeCup className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Live Preview
              </h4>
            </div>

            <div className="rounded-2xl bg-[#17100D] border border-white/10 p-6 flex flex-col items-center gap-4 shadow-inner">
              <div className={`w-20 h-20 bg-[#D49A6A]/20 flex items-center justify-center overflow-hidden ring-1 ring-[#D49A6A]/30 ${shapeClass(form.logoShape)}`}>
                {form.logo ? (
                  <img
                    src={form.logo}
                    alt="Store Logo"
                    className="w-14 h-14 object-contain"
                    style={{ transform: `scale(${form.logoScale ?? 1})` }}
                  />
                ) : (
                  <Icons.CoffeeCup className="w-8 h-8 text-[#F5E8D8]" />
                )}
              </div>
              <div className="text-center">
                <p className="font-extrabold text-lg text-[#F5E8D8] font-heading" style={{ fontFamily: 'Georgia, serif' }}>
                  {form.storeName || 'Your Store Name'}
                </p>
                <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase mt-1">
                  Cashier POS
                </p>
              </div>
              <div className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-semibold">Shown on</span>
                <span className="text-[10px] text-[#D49A6A] font-bold">Login • POS • Receipt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editorSrc && (
        <LogoEditorModal
          src={editorSrc}
          onCancel={() => setEditorSrc(null)}
          onApply={handleEditorApply}
        />
      )}
    </div>
  );
}
