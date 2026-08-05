import React, { useState } from 'react';
import { Icons } from './Icons';

const PRINTER_STATIONS = [
  {
    id: 'receipt',
    label: 'Receipt Printer Station',
    endpoint: '80mm Thermal USB POS-001',
    status: 'Connected',
    statusColor: 'emerald',
    description: 'Ready to print',
    printerType: 'receiptPrinter',
  },
  {
    id: 'kitchen',
    label: 'Kitchen Display Printer Station',
    endpoint: '80mm Thermal Ethernet 192.168.1.42',
    status: 'Idle',
    statusColor: 'amber',
    description: 'Last printed 4m ago',
    printerType: 'kitchenPrinter',
  },
];

const PRINT_TRIGGERS = [
  {
    event: 'Payment Completed',
    icon: 'Settings',
    destination: 'Receipt Printer Station',
    format: 'Standard 80mm',
    copies: 1,
    enabled: true,
  },
  {
    event: 'Order Sent to Bar',
    icon: 'Settings',
    destination: 'Kitchen Display Printer',
    format: 'Chit 80mm',
    copies: 2,
    enabled: true,
  },
  {
    event: 'Order Voided',
    icon: 'Settings',
    destination: 'Kitchen Display Printer',
    format: 'Chit 80mm',
    copies: 1,
    enabled: false,
  },
];

export function PrinterSettingsPage({ settings, onUpdateSettings }) {
  const [form, setForm] = useState({
    receiptPrinter: settings?.receiptPrinter ?? '',
    kitchenPrinter: settings?.kitchenPrinter ?? '',
  });
  const [printMode, setPrintMode] = useState('auto');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const hasChanges = Object.keys(form).some(
    (k) => form[k] !== settings?.[k]
  );

  const handleSave = (e) => {
    if (e) e.preventDefault();
    onUpdateSettings({ ...settings, ...form });
    setMsg({ text: 'Printer configuration saved successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  return (
    <div className="animate-fadeIn space-y-6">

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

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/60 border border-[#C08552]/20 text-[11px] font-extrabold text-[#3C2A21] hover:bg-white/80 hover:border-[#C08552]/40 transition-all active:scale-95 shadow-sm">
          <Icons.Search className="w-3.5 h-3.5" />
          Scan Network
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-extrabold shadow-lg transition-all ${
            hasChanges
              ? 'bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 hover:brightness-110 active:scale-95 cursor-pointer'
              : 'bg-[#3C2A21]/30 text-[#3C2A21]/40 cursor-not-allowed'
          }`}
        >
          <Icons.Edit className="w-3.5 h-3.5" />
          Save Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-[#C08552]/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                  <Icons.Kitchen className="w-4 h-4 text-[#693F27]" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                    Printer Profiles
                  </h3>
                  <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                    2 Active Stations
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {PRINTER_STATIONS.map((station) => {
                const isConnected = station.status === 'Connected';
                return (
                  <div
                    key={station.id}
                    className="rounded-2xl bg-white/40 border border-[#C08552]/10 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isConnected
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-amber-500/10 text-amber-700'
                        }`}>
                          <Icons.Kitchen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-[#3C2A21]">
                            {station.label}
                          </h4>
                          <p className="text-[10px] font-mono text-[#3C2A21]/50 mt-0.5">
                            {station.endpoint}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            isConnected
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-amber-500/10 text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {station.status}
                        </span>
                        <button className="p-1.5 rounded-lg text-[#3C2A21]/30 hover:text-[#3C2A21] hover:bg-white/50 transition-all">
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-[#3C2A21]/30 hover:text-[#3C2A21] hover:bg-white/50 transition-all">
                          <Icons.Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#3C2A21]/50 font-medium">
                        {station.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#C08552]/20 text-[11px] font-extrabold text-[#C08552] hover:border-[#C08552]/40 hover:bg-[#C08552]/5 transition-all active:scale-[0.99]">
              <Icons.Plus className="w-4 h-4" />
              Register New Network Printer
            </button>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.Inventory className="w-3.5 h-3.5 text-sky-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-[#3C2A21]">
                  Hardware Layout
                </h4>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-1 leading-relaxed italic">
                  &ldquo;Optimal setup for coffee shop stations: Ethernet
                  for high-latency kitchen areas, USB for front-of-house
                  point-of-sale stability.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Settings className="w-4 h-4 text-[#693F27]" />
              </div>
              <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">
                Global Printing Rules
              </h3>
            </div>

            <div className="flex gap-2 p-1 rounded-2xl bg-[#3C2A21]/5 w-fit">
              <button
                onClick={() => setPrintMode('auto')}
                className={`px-5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${
                  printMode === 'auto'
                    ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                    : 'text-[#3C2A21]/50 hover:text-[#3C2A21]'
                }`}
              >
                Auto-Print
              </button>
              <button
                onClick={() => setPrintMode('manual')}
                className={`px-5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${
                  printMode === 'manual'
                    ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                    : 'text-[#3C2A21]/50 hover:text-[#3C2A21]'
                }`}
              >
                Manual Only
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#C08552]/10">
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Event Trigger
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Destination
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Paper Format
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider pr-4">
                      Copies
                    </th>
                    <th className="pb-2.5 text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PRINT_TRIGGERS.map((trigger, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#C08552]/5 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Icons.History className="w-3.5 h-3.5 text-[#C08552]/60" />
                          <span className="text-[11px] font-extrabold text-[#3C2A21]">
                            {trigger.event}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-[#3C2A21]/70 font-medium">
                          {trigger.destination}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] text-[#3C2A21]/50 font-medium">
                          {trigger.format}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-extrabold text-[#3C2A21]">
                          {trigger.copies}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            trigger.enabled
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-red-500/10 text-red-700'
                          }`}
                        >
                          {trigger.enabled ? 'Enabled' : 'Disabled'}
                        </span>
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
                <Icons.Flask className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Diagnostics
              </h4>
            </div>

            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-extrabold text-[#3C2A21]/70 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-[0.99]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                  <Icons.Flask className="w-3.5 h-3.5 text-[#693F27]" />
                </div>
                Test Connection
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-extrabold text-[#3C2A21]/70 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-[0.99]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                  <Icons.Search className="w-3.5 h-3.5 text-[#693F27]" />
                </div>
                Calibration Page
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-extrabold text-[#3C2A21]/70 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-[0.99]">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                  <Icons.Trash className="w-3.5 h-3.5 text-[#693F27]" />
                </div>
                Clear Print Spooler
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <h4 className="font-heading font-extrabold text-xs text-[#3C2A21]">
              Printer Endpoints
            </h4>
            <div className="space-y-3">
              <div className="group">
                <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1">
                  <Icons.Kitchen className="w-2.5 h-2.5 text-[#C08552]/70" />
                  Receipt Printer
                </label>
                <input
                  type="text"
                  value={form.receiptPrinter}
                  placeholder="e.g. 80mm Thermal USB POS-001"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      receiptPrinter: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-[11px] rounded-xl glass-input font-mono text-[#3C2A21] placeholder:text-[#3C2A21]/30 transition-shadow"
                />
              </div>
              <div className="group">
                <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-1">
                  <Icons.Kitchen className="w-2.5 h-2.5 text-[#C08552]/70" />
                  Kitchen Printer
                </label>
                <input
                  type="text"
                  value={form.kitchenPrinter}
                  placeholder="e.g. 80mm Thermal Ethernet 192.168.1.42"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      kitchenPrinter: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-[11px] rounded-xl glass-input font-mono text-[#3C2A21] placeholder:text-[#3C2A21]/30 transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}