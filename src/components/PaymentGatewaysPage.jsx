import React, { useState } from 'react';
import { Icons } from './Icons';

const PAYMENT_METHODS = [
  {
    id: 'cash',
    label: 'Cash Payment',
    description: 'Standard physical till operation. Includes daily float tracking and reconciliation reports.',
    icon: 'Settings',
    badge: 'Active on Terminal 01',
    badgeColor: 'emerald',
  },
  {
    id: 'creditCard',
    label: 'Credit/Debit Card Terminal',
    description: 'Integrated EMV chip and NFC processing. Support for Visa, Mastercard, and AMEX.',
    icon: 'Settings',
    details: [
      { label: 'Processing Fee', value: '1.8% + $0.10' },
      { label: 'Payout Schedule', value: 'Next Day' },
    ],
    action: 'Configure Terminal',
    badge: 'Online',
    badgeColor: 'emerald',
  },
  {
    id: 'gcash',
    label: 'GCash Digital Wallet',
    description: 'e-Wallet Integration',
    icon: 'Settings',
    details: [
      { label: 'Merchant ID', value: '********4829' },
    ],
    badge: 'Enabled',
    badgeColor: 'emerald',
    extraAction: 'View Transactions',
  },
  {
    id: 'maya',
    label: 'Maya Digital Wallet',
    description: 'QR Ph Ready',
    icon: 'Settings',
    disabled: true,
    badge: 'Disabled',
    badgeColor: 'red',
    disabledMessage: 'Maya is currently disabled. Connect your business account to start accepting Maya and QR Ph payments.',
    action: 'Connect Business Account',
  },
];

const GATEWAY_ACTIVITY = [
  {
    gateway: 'Cash Drawer',
    icon: 'Settings',
    status: 'Synced',
    volume: '₱12,450.00',
    transactions: 48,
    uptime: '100%',
    statusColor: 'emerald',
  },
  {
    gateway: 'GCash',
    icon: 'Settings',
    status: 'Connected',
    volume: '₱8,920.50',
    transactions: 32,
    uptime: '99.9%',
    statusColor: 'emerald',
  },
  {
    gateway: 'Terminal A1',
    icon: 'Settings',
    status: 'Online',
    volume: '₱24,110.00',
    transactions: 64,
    uptime: '100%',
    statusColor: 'emerald',
  },
];

export function PaymentGatewaysPage({ settings, onUpdateSettings }) {
  const [payments, setPayments] = useState({
    cash: settings?.payments?.cash ?? true,
    gcash: settings?.payments?.gcash ?? true,
    maya: settings?.payments?.maya ?? false,
    creditCard: settings?.payments?.creditCard ?? true,
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const hasChanges = Object.keys(payments).some(
    (k) => payments[k] !== settings?.payments?.[k]
  );

  const handleToggle = (method) => {
    setPayments((prev) => ({ ...prev, [method]: !prev[method] }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({ ...settings, payments });
    setMsg({ text: 'Payment gateway settings saved successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.History className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  Enabled Payment Gateways
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Toggle payment methods available at checkout
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

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const enabled = payments[method.id];
                  const isDisabled = method.id === 'maya' && !enabled;
                  return (
                    <div
                      key={method.id}
                      className={`rounded-2xl bg-white/40 border p-5 transition-all ${
                        isDisabled
                          ? 'border-[#C08552]/10 opacity-70'
                          : 'border-[#C08552]/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              enabled
                                ? 'bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 text-[#693F27]'
                                : 'bg-[#3C2A21]/5 text-[#3C2A21]/30'
                            }`}
                          >
{method.id === 'cash' ? (
                              <Icons.CoffeeCup className="w-4 h-4" />
                            ) : method.id === 'creditCard' ? (
                              <Icons.Kitchen className="w-4 h-4" />
                            ) : (
                              <Icons.History className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className={`font-extrabold text-xs ${
                                  enabled ? 'text-[#3C2A21]' : 'text-[#3C2A21]/50'
                                }`}
                              >
                                {method.label}
                              </h4>
                              {method.badge && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${
                                    method.badgeColor === 'emerald'
                                      ? 'bg-emerald-500/10 text-emerald-700'
                                      : 'bg-red-500/10 text-red-700'
                                  }`}
                                >
                                  {enabled ? method.badge : 'Disabled'}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[10px] font-medium mt-0.5 ${
                                enabled ? 'text-[#3C2A21]/50' : 'text-[#3C2A21]/30'
                              }`}
                            >
                              {method.description}
                            </p>

                            {method.details && enabled && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                {method.details.map((d, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] text-[#3C2A21]/50 font-medium"
                                  >
                                    {d.label}:{' '}
                                    <span className="font-extrabold text-[#3C2A21]">
                                      {d.value}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {isDisabled && method.disabledMessage && (
                              <p className="text-[10px] text-amber-700 font-medium mt-2 flex items-center gap-1">
                                <Icons.Bell className="w-3 h-3 shrink-0" />
                                {method.disabledMessage}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {method.action && enabled && (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold text-[#693F27] bg-[#693F27]/5 hover:bg-[#693F27]/10 transition-all active:scale-95 whitespace-nowrap"
                            >
                              {method.action}
                            </button>
                          )}
                          {method.extraAction && enabled && (
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-[#3C2A21]/30 hover:text-[#693F27] hover:bg-[#C08552]/10 transition-all"
                            >
<Icons.Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {method.id !== 'maya' && (
                            <button
                              type="button"
                              onClick={() => handleToggle(method.id)}
                              className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${
                                enabled ? 'bg-emerald-600' : 'bg-[#3C2A21]/20'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow-sm transition-all ${
                                  enabled ? 'right-1' : 'left-1'
                                }`}
                              />
                            </button>
                          )}
                          {isDisabled && (
                            <button
                              type="button"
                              onClick={() => handleToggle(method.id)}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold text-[#693F27] bg-[#693F27]/5 hover:bg-[#693F27]/10 transition-all active:scale-95 whitespace-nowrap"
                            >
                              {method.action}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    <Icons.Edit className="w-3.5 h-3.5" />
                    Save Payment Settings
                  </span>
                </button>
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
                    Recent Gateway Activity
                  </h3>
                  <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                    Last 24 hours cross-gateway volume
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold text-[#3C2A21]/60 hover:text-[#3C2A21] hover:bg-white/50 transition-all">
                  Download CSV
                </button>
                <button className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold text-[#693F27] bg-[#693F27]/5 hover:bg-[#693F27]/10 transition-all">
                  View Analytics
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#C08552]/10">
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Gateway
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Status
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Volume (PHP)
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Transactions
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Uptime
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody>
                  {GATEWAY_ACTIVITY.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#C08552]/5 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Icons.Dashboard className="w-3.5 h-3.5 text-[#C08552]/60" />
                          <span className="text-[11px] font-extrabold text-[#3C2A21]">
                            {entry.gateway}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            entry.statusColor === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-amber-500/10 text-amber-700'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-extrabold text-[#3C2A21]">
                          {entry.volume}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-[#3C2A21]/70 font-medium">
                          {entry.transactions}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-emerald-700 font-extrabold">
                          {entry.uptime}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="p-1 rounded-lg text-[#3C2A21]/30 hover:text-[#3C2A21] transition-colors">
                          <Icons.History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C08552]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Dashboard className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Gateway Summary
              </h4>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.filter((m) => payments[m.id] && m.id !== 'maya').map(
                (method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-[#C08552]/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                        {method.id === 'cash' ? (
                          <Icons.CoffeeCup className="w-3 h-3" />
                        ) : method.id === 'creditCard' ? (
                          <Icons.Kitchen className="w-3 h-3" />
                        ) : (
                          <Icons.History className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-[11px] font-extrabold text-[#3C2A21]">
                        {method.label}
                      </span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                )
              )}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-[#C08552]/10 opacity-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-700">
                      <Icons.History className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#3C2A21]">
                    Maya Digital Wallet
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-700 bg-red-500/10 px-2 py-0.5 rounded-full">
                  Disabled
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-start gap-2">
                <Icons.Bell className="w-3 h-3 text-amber-700 mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#3C2A21]/50 font-medium leading-relaxed">
                  Connect Maya to unlock QR Ph payments for faster checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}