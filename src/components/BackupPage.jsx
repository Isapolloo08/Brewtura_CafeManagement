import React, { useState } from 'react';
import { Icons } from './Icons';

const RECENT_OPERATIONS = [
  {
    icon: 'Settings',
    iconBg: 'emerald',
    label: 'Offsite Sync',
    time: '2h ago',
    description: 'Database partial upload completed.',
  },
  {
    icon: 'Settings',
    iconBg: 'emerald',
    label: 'Integrity Check',
    time: '5h ago',
    description: 'Checksum validation: 100% matched.',
  },
  {
    icon: 'Settings',
    iconBg: 'amber',
    label: 'API Timeout',
    time: 'Yesterday',
    description: 'Retry logic triggered for target S3-East.',
  },
];

export function BackupPage() {
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [backingUp, setBackingUp] = useState(false);

  const handleManualBackup = () => {
    setBackingUp(true);
    setMsg({ text: '', type: '' });
    setTimeout(() => {
      setBackingUp(false);
      setMsg({
        text: 'Manual database backup created! File: brewtura_backup_20260729.db (Encrypted)',
        type: 'success',
      });
      setTimeout(() => setMsg({ text: '', type: '' }), 5000);
    }, 1500);
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
                  Backup Status
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Latest backup and storage overview
                </p>
              </div>
            </div>

            {msg.text && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-xs font-extrabold animate-slideDown ${msg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900'
                    : 'bg-red-500/10 border border-red-500/20 text-red-900'
                  }`}
              >
                <Icons.Bell className="w-3.5 h-3.5 shrink-0" />
                {msg.text}
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/15 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                    <Icons.History className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[#3C2A21]">
                      Latest Automatic Backup
                    </p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Status: Successfully Verified
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icons.Dashboard className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[9px] font-extrabold text-[#3C2A21]/40 uppercase tracking-wider mb-1">
                    Timestamp
                  </p>
                  <p className="text-[11px] font-extrabold text-[#3C2A21]">
                    Oct 24, 2023 &mdash; 04:00 AM
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-[#3C2A21]/40 uppercase tracking-wider mb-1">
                    Total File Size
                  </p>
                  <p className="text-[11px] font-extrabold text-[#3C2A21]">
                    1.42 GB
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-[#3C2A21]/40 uppercase tracking-wider mb-1">
                    Integrity Score
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-2 rounded-full bg-[#3C2A21]/10 overflow-hidden">
                      <div className="h-full w-[99%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700">
                      99%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleManualBackup}
                disabled={backingUp}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all ${backingUp
                    ? 'bg-[#3C2A21]/30 text-[#3C2A21]/40 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 hover:brightness-110 active:scale-95 cursor-pointer'
                  }`}
              >
                <Icons.History className="w-3.5 h-3.5" />
                {backingUp ? 'Backing up...' : 'Trigger Manual Backup'}
              </button>
              <button className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-extrabold text-[#693F27] bg-[#693F27]/5 hover:bg-[#693F27]/10 transition-all active:scale-95">
                <Icons.Flask className="w-3.5 h-3.5" />
                Restore &amp; Verify Integrity
              </button>
              <button className="px-4 py-3 rounded-2xl text-xs font-extrabold text-[#3C2A21]/50 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95">
                View Detailed Log
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.Inventory className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">
                  Backup Targets
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Configured storage destinations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/40 border border-[#C08552]/10 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-700">
                    <Icons.Inventory className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[#3C2A21]">
                      AWS S3 Glacier
                    </p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#3C2A21]/40">
                      Primary Offsite Storage
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/40 border border-[#C08552]/10 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                    <Icons.Kitchen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-[#3C2A21]">
                      Local RAID-5
                    </p>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#3C2A21]/40">
                      Local Redundancy Node 01
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold text-[#3C2A21]/50 uppercase tracking-wider">
                  Storage Capacity
                </p>
                <p className="text-[10px] font-extrabold text-[#3C2A21]">
                  Used: 650 GB / Total: 1 TB
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-[#3C2A21]/10 overflow-hidden">
                <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[#C08552] to-[#693F27]" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 pb-1 border-b border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.History className="w-4 h-4 text-[#693F27]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">
                  Recent Operations
                </h3>
                <p className="text-[10px] text-[#3C2A21]/40 font-medium">
                  Backup and integrity check history
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {RECENT_OPERATIONS.map((op, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/40 border border-[#C08552]/10"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${op.iconBg === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : 'bg-amber-500/10 text-amber-700'
                      }`}
                  >
                    {op.label === 'Offsite Sync' ? (
                      <Icons.History className="w-3.5 h-3.5" />
                    ) : op.label === 'Integrity Check' ? (
                      <Icons.Flask className="w-3.5 h-3.5" />
                    ) : (
                      <Icons.Bell className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-[#3C2A21]">
                        {op.label}
                      </h4>
                      <span className="text-[9px] font-extrabold text-[#3C2A21]/40 uppercase tracking-wider">
                        {op.time}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-0.5">
                      {op.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#C08552]/20 text-[11px] font-extrabold text-[#C08552] hover:border-[#C08552]/40 hover:bg-[#C08552]/5 transition-all active:scale-[0.99]">
              <Icons.Search className="w-4 h-4" />
              Full Audit Trail
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C08552]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
                <Icons.History className="w-3.5 h-3.5 text-[#693F27]" />
              </div>
              <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                Automated Schedule
              </h4>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-[#C08552]/5 to-[#693F27]/5 border border-[#C08552]/10">
              <div className="w-9 h-9 rounded-xl bg-[#3C2A21] flex items-center justify-center text-amber-100 text-[11px] font-extrabold">
                04:00
              </div>
              <div>
                <p className="font-extrabold text-xs text-[#3C2A21]">
                  Daily Slot
                </p>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium">
                  Configuration Snapshot + Transaction WAL Logs
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/40 border border-[#C08552]/10 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#3C2A21]/60 font-medium">
                  Configuration Snapshot
                </span>
                <span className="font-extrabold text-emerald-700">Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#3C2A21]/60 font-medium">
                  Transaction WAL Logs
                </span>
                <span className="font-extrabold text-emerald-700">Active</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.Dashboard className="w-3.5 h-3.5 text-sky-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-[#3C2A21]">
                  Visualizing Security
                </h4>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-1 leading-relaxed italic">
                  &ldquo;Our careful approach extends to your data. Every backup
                  is double-encrypted and stored across three continents to
                  ensure your brew never misses a beat.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}