import React, { useState } from 'react';
import { Icons } from './Icons';

// Settings come back from the API as TEXT, so booleans arrive as 'true'/'false'.
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

const shapeClass = (shape) =>
  shape === 'circle'
    ? 'rounded-full'
    : shape === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-none';

export function ReceiptLayoutPage({ settings, onUpdateSettings, onGoToBranding }) {
  const vatPct = Math.round((parseFloat(settings?.vatRate) || 0) * 100 * 10) / 10;

  // The logo itself (plus its shape and size) is owned by the Store Branding
  // page. Read it live from settings so editing it there instantly updates the
  // receipt — this page only decides whether it gets printed.
  const logo = settings?.logo || '';
  const logoShape = settings?.logoShape || 'circle';
  const logoScale = parseFloat(settings?.logoScale) || 1;

  const readForm = () => ({
    storeName: settings?.storeName ?? '',
    taxId: settings?.taxId ?? '',
    address: settings?.address ?? '',
    vatRate: vatPct,
    receiptHeader: settings?.receiptHeader ?? '',
    receiptFooter: settings?.receiptFooter ?? '',
    qrCodeEnabled: toBool(settings?.qrCodeEnabled),
    receiptShowLogo:
      settings?.receiptShowLogo === undefined
        ? true
        : toBool(settings.receiptShowLogo),
  });

  const [form, setForm] = useState(readForm);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const saved = readForm();
  const hasChanges = Object.keys(form).some((k) => form[k] !== saved[k]);
  const showLogo = !!logo && form.receiptShowLogo;

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      ...form,
      vatRate: (parseFloat(form.vatRate) || 0) / 100,
    });
    setMsg({ text: 'Receipt layout saved successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleReset = () => {
    setForm(readForm());
  };

  const subtotal = 8.9;
  const vatAmount = (subtotal * form.vatRate) / 100;
  const total = subtotal + vatAmount;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Settings className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  Receipt Customizer
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Configure receipt header, footer, and QR code settings
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
                <Icons.Settings className="w-3.5 h-3.5 shrink-0" />
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/40 border border-[#C08552]/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider">
                    <Icons.Camera className="w-3 h-3 text-[#C08552]/70" />
                    Receipt Logo
                  </label>
                  {onGoToBranding && (
                    <button
                      type="button"
                      onClick={onGoToBranding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-[#693F27] hover:bg-amber-900/10 transition-all active:scale-95"
                    >
                      <Icons.Edit className="w-3 h-3" />
                      Edit in Store Branding
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 bg-white/70 border border-[#C08552]/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner ${shapeClass(logoShape)}`}
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt="Store Logo"
                        className="w-11 h-11 object-contain"
                        style={{ transform: `scale(${logoScale})` }}
                      />
                    ) : (
                      <Icons.CoffeeCup className="w-7 h-7 text-[#3C2A21]/25" />
                    )}
                  </div>

                  <div className="min-w-0">
                    {logo ? (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.receiptShowLogo}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              receiptShowLogo: e.target.checked,
                            }))
                          }
                          className="rounded-md text-[#C08552] focus:ring-[#C08552] focus:ring-offset-0 w-4 h-4 border-[#C08552]/40"
                        />
                        <div>
                          <span className="font-extrabold text-xs text-[#3C2A21]">
                            Print Store Logo on Receipt
                          </span>
                          <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-0.5 leading-relaxed">
                            Uses the {logoShape} logo at{' '}
                            {Math.round(logoScale * 100)}% from Store Branding —
                            updating it there refreshes this receipt
                            automatically.
                          </p>
                        </div>
                      </label>
                    ) : (
                      <p className="text-[10px] text-[#3C2A21]/50 font-medium leading-relaxed">
                        No logo uploaded yet. Add one in{' '}
                        <span className="font-extrabold text-[#693F27]">
                          Store Branding
                        </span>{' '}
                        and it will appear here and at the top of every printed
                        receipt.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={form.storeName}
                    placeholder="e.g. Brewtura - Downtown"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, storeName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21] placeholder:font-medium placeholder:text-[#3C2A21]/30 transition-shadow"
                  />
                </div>
                <div className="group">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                    Tax ID / VAT Number
                  </label>
                  <input
                    type="text"
                    value={form.taxId}
                    placeholder="e.g. PH-882-001-023"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, taxId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21] placeholder:font-medium placeholder:text-[#3C2A21]/30 transition-shadow"
                  />
                </div>
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                  Store Address
                </label>
                <textarea
                  rows={2}
                  value={form.address}
                  placeholder="e.g. 120 Brew Street, Industrial District, Metro Manila, Philippines"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-medium text-[#3C2A21] placeholder:text-[#3C2A21]/30 resize-none transition-shadow"
                />
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                  Header Message
                </label>
                <input
                  type="text"
                  value={form.receiptHeader}
                  placeholder="e.g. Welcome to Brewtura!"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, receiptHeader: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21] placeholder:font-medium placeholder:text-[#3C2A21]/30 transition-shadow"
                />
              </div>

              <div className="group">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                  <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                  Footer Message
                </label>
                <textarea
                  rows={3}
                  value={form.receiptFooter}
                  placeholder="e.g. Thank you for supporting sustainable coffee! Follow us @Brewtura"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, receiptFooter: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input font-medium text-[#3C2A21] placeholder:text-[#3C2A21]/30 resize-none transition-shadow"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/40 border border-[#C08552]/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.qrCodeEnabled}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        qrCodeEnabled: e.target.checked,
                      }))
                    }
                    className="rounded-md text-[#C08552] focus:ring-[#C08552] focus:ring-offset-0 w-4 h-4 border-[#C08552]/40"
                  />
                  <div>
                    <span className="font-extrabold text-xs text-[#3C2A21]">
                      Print Feedback &amp; Loyalty QR Code
                    </span>
                    <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-0.5">
                      Customers can scan to leave a review or join your loyalty
                      program.
                    </p>
                  </div>
                </label>
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
                    Save Receipt Layout
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
                <Icons.Settings className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-[#3C2A21]">
                  Pro Tip
                </h4>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-1 leading-relaxed">
                  Updating your receipt footer with current seasonal promotions
                  can increase customer return rates by up to 15%.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C08552]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Settings className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Live Preview
              </h4>
            </div>

            <div className="rounded-2xl bg-[#FAF4EB] border border-[#C08552]/15 p-5 font-mono text-[11px] text-[#3C2A21] space-y-3 shadow-inner">
              <div className="text-center space-y-1">
                {showLogo && (
                  <div
                    className={`w-16 h-16 mx-auto mb-2 bg-white border border-[#C08552]/20 flex items-center justify-center overflow-hidden shadow-sm ${shapeClass(logoShape)}`}
                  >
                    <img
                      src={logo}
                      alt="Store Logo"
                      className="w-12 h-12 object-contain"
                      style={{ transform: `scale(${logoScale})` }}
                    />
                  </div>
                )}
                <p className="font-extrabold text-sm uppercase tracking-wider text-[#3C2A21]">
                  {form.storeName || 'Your Store Name'}
                </p>
                <p className="text-[10px] text-[#3C2A21]/60">
                  {form.address || 'Store Address'}
                </p>
                <p className="text-[10px] text-[#3C2A21]/60">
                  VAT Reg: {form.taxId || 'N/A'}
                </p>
                <div className="my-2 border-b border-dashed border-[#C08552]/30" />
                <p className="font-bold text-[11px] text-[#3C2A21]">
                  {form.receiptHeader || 'Header Message'}
                </p>
              </div>

              <div className="my-3 space-y-1 py-2 border-y border-dashed border-[#C08552]/30 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#3C2A21]/70">1x Iced Brewtura Latte</span>
                  <span className="font-extrabold text-[#3C2A21]">$4.75</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3C2A21]/70">1x Butter Croissant</span>
                  <span className="font-extrabold text-[#3C2A21]">$4.15</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#3C2A21]/50">Subtotal:</span>
                  <span className="font-extrabold text-[#3C2A21]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3C2A21]/50">
                    VAT ({form.vatRate}%):
                  </span>
                  <span className="font-extrabold text-[#3C2A21]">
                    ${vatAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#3C2A21] pt-1 border-t border-[#C08552]/20">
                  <span>TOTAL:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-4 space-y-2 border-t border-dashed border-[#C08552]/30">
                <p className="text-[10px] italic text-[#3C2A21]/60">
                  {form.receiptFooter || 'Footer Message'}
                </p>
                {form.qrCodeEnabled && (
                  <div className="w-16 h-16 bg-[#3C2A21] mx-auto rounded-lg flex items-center justify-center text-amber-100 text-[9px] font-extrabold shadow-md">
                    QR CODE
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
