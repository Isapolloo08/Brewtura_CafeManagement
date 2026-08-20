import React, { useState } from 'react';
import { Icons } from './Icons';

const AUDIT_LOG = [
  {
    date: 'Oct 24, 2023 \u2022 09:12 AM',
    setting: 'VAT Rate',
    prev: '10%',
    curr: '12%',
    by: 'Julianne Doe',
    initials: 'JD',
  },
  {
    date: 'Aug 15, 2023 \u2022 04:45 PM',
    setting: 'Service Charge',
    prev: '4%',
    curr: '5%',
    by: 'Marcus K.',
    initials: 'MK',
  },
];

export function TaxSettingsPage({ settings, onUpdateSettings }) {
  const pct = (v) => Math.round((parseFloat(v) || 0) * 100 * 10) / 10;
  const vatPct = pct(settings?.vatRate);
  const servicePct = pct(settings?.serviceCharge);
  const inclusive = String(settings?.taxInclusive).toLowerCase() === 'true';

  const [form, setForm] = useState({
    vatRate: vatPct,
    serviceCharge: servicePct,
    taxInclusive: inclusive,
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const hasChanges =
    form.vatRate !== vatPct ||
    form.serviceCharge !== servicePct ||
    form.taxInclusive !== inclusive;

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      ...form,
      vatRate: (parseFloat(form.vatRate) || 0) / 100,
      serviceCharge: (parseFloat(form.serviceCharge) || 0) / 100,
      taxInclusive: String(!!form.taxInclusive),
    });
    setMsg({ text: 'Tax settings saved successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleReset = () => {
    setForm({
      vatRate: vatPct,
      serviceCharge: servicePct,
      taxInclusive: inclusive,
    });
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Settings className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  Global Tax Rates
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Manage VAT and Service Charges
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

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="group">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                    VAT Rate (Value Added Tax)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.vatRate}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          vatRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 pr-8 text-xs rounded-xl glass-input font-bold text-[#3C2A21] transition-shadow"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#3C2A21]/40">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-[#3C2A21]/40 font-medium mt-1">
                    Standard rate applied to all non-exempt items.
                  </p>
                </div>

                <div className="group">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1.5">
                    <Icons.Settings className="w-3 h-3 text-[#C08552]/70" />
                    Service Charge
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.serviceCharge}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          serviceCharge: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 pr-8 text-xs rounded-xl glass-input font-bold text-[#3C2A21] transition-shadow"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#3C2A21]/40">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-[#3C2A21]/40 font-medium mt-1">
                    Optional fee for table service and group bookings.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/40 border border-[#C08552]/10">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.taxInclusive}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        taxInclusive: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded-md text-[#C08552] focus:ring-[#C08552] focus:ring-offset-0 w-4 h-4 border-[#C08552]/40"
                  />
                  <div>
                    <span className="font-extrabold text-xs text-[#3C2A21]">
                      Prices are Tax-Inclusive
                    </span>
                    <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-0.5">
                      If enabled, listed menu prices already account for the VAT
                      rate. If disabled, taxes will be calculated and added at
                      checkout.
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
                    Save Changes
                  </span>
                </button>
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-3 rounded-2xl text-xs font-extrabold text-[#3C2A21]/60 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                  <Icons.History className="w-4 h-4 text-[#693F27]" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">
                    Recent Tax Modifications
                  </h3>
                  <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                    Audit trail of tax rate changes
                  </p>
                </div>
              </div>
              <button className="text-[#3C2A21]/40 hover:text-[#3C2A21] transition-colors">
                <Icons.Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#C08552]/10">
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Modified Date
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Setting
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Previous Value
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      New Value
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider">
                      Authorized By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_LOG.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#C08552]/5 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-[#3C2A21]/60 font-medium">
                          {entry.date}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-extrabold text-[#3C2A21]">
                          {entry.setting}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-[#3C2A21]/50 font-medium line-through">
                          {entry.prev}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-extrabold text-emerald-700">
                          {entry.curr}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C08552]/30 to-[#693F27]/20 flex items-center justify-center text-[9px] font-extrabold text-[#693F27]">
                            {entry.initials}
                          </div>
                          <span className="text-[11px] text-[#3C2A21]/70 font-medium">
                            {entry.by}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C08552]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Settings className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Live Preview
              </h4>
            </div>

            <div className="rounded-2xl bg-white/50 border border-[#C08552]/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#3C2A21]">
                  Order Summary
                </span>
                <span className="text-[9px] font-extrabold text-[#3C2A21]/40 uppercase tracking-wider">
                  Preview
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#3C2A21]/60">Caff\u00e8 Latte</span>
                  <span className="font-extrabold text-[#3C2A21]">
                    $4.50
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#3C2A21]/60">Cold Brew</span>
                  <span className="font-extrabold text-[#3C2A21]">
                    $5.25
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#3C2A21]/60">Blueberry Muffin</span>
                  <span className="font-extrabold text-[#3C2A21]">
                    $3.75
                  </span>
                </div>
              </div>
              <div className="border-t border-[#C08552]/10 pt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#3C2A21]/50">Subtotal</span>
                  <span className="font-extrabold text-[#3C2A21]">$13.50</span>
                </div>
                {form.taxInclusive ? (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#3C2A21]/50">
                      VAT ({form.vatRate}%)
                    </span>
                    <span className="text-[#3C2A21]/50 font-medium">
                      Included
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#3C2A21]/50">
                      VAT ({form.vatRate}%)
                    </span>
                    <span className="font-extrabold text-[#3C2A21]">
                      +${((13.5 * form.vatRate) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {form.serviceCharge > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#3C2A21]/50">
                      Service ({form.serviceCharge}%)
                    </span>
                    <span className="font-extrabold text-[#3C2A21]">
                      +${((13.5 * form.serviceCharge) / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t border-[#C08552]/15 pt-2 flex justify-between">
                <span className="text-xs font-extrabold text-[#3C2A21]">
                  Total
                </span>
                <span className="text-xs font-extrabold text-[#3C2A21]">
                  $
                  {(
                    13.5 +
                    (form.taxInclusive
                      ? 0
                      : (13.5 * form.vatRate) / 100) +
                    (13.5 * form.serviceCharge) / 100
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.Settings className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-[#3C2A21]">
                  Compliance Reminder
                </h4>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-1 leading-relaxed">
                  Regulations require that tax-inclusive pricing is clearly
                  stated on your physical menus and digital receipts. Ensure
                  your printed templates reflect these global settings.
                </p>
                <button className="mt-2 text-[10px] font-extrabold text-[#693F27] hover:text-[#3C2A21] transition-colors">
                  View Tax Laws Documentation
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
              Quick Shortcuts
            </h4>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-extrabold text-[#3C2A21]/70 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95">
                <Icons.History className="w-4 h-4" />
                Tax Logs
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-extrabold text-[#3C2A21]/70 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95">
                <Icons.Settings className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}