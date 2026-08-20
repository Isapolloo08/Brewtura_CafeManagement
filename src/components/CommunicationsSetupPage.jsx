import React, { useState, useEffect, useCallback } from 'react';
import { GmailPanel } from './GmailPanel';
import { SimSetupPanel } from './SimSetupPanel';
import { Icons } from './Icons';
import api from '../services/api.js';

export function CommunicationsSetupPage({ suppliers, settings, onUpdateSettings }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'email', 'sim', 'suppliers', 'guides'
  const [supplierList, setSupplierList] = useState(suppliers || []);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Live status states for summary header
  const [gmailStatus, setGmailStatus] = useState(null);
  const [smsStatus, setSmsStatus] = useState(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const [gSt, sSt] = await Promise.all([
        api.getGmailStatus().catch(() => ({ configured: false, connected: false })),
        api.getSmsStatus().catch(() => ({ connected: false })),
      ]);
      setGmailStatus(gSt);
      setSmsStatus(sSt);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 15000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      setSupplierList(suppliers.map(s => ({
        id: String(s.id),
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
      })));
      return;
    }
    api.getSuppliers()
      .then(list => setSupplierList(list.map(s => ({
        id: String(s.id),
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
      }))))
      .catch(() => {});
  }, [suppliers]);

  const handleSaveSupplierContacts = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      for (const s of supplierList) {
        if (s.id && !s.id.startsWith('sup-')) {
          await api.createSupplier({ name: s.name, email: s.email, phone: s.phone });
        }
      }
      setSavedMsg('Supplier contacts (Email & Phone) saved successfully.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      console.warn('Failed to save supplier contacts:', err);
      setSavedMsg('Failed to save. Check server connection.');
    } finally {
      setSaving(false);
    }
  };

  const isGmailConnected = Boolean(gmailStatus?.connected);
  const isSmsConnected = Boolean(smsStatus?.connected);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Channels Status Banner */}
      <div className="glass-card p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider">
              Communications & Ingestion Hub
            </span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Communications Setup
          </h2>
          <p className="text-xs text-amber-900/70 font-medium mt-0.5 max-w-2xl">
            Configure inbound and outbound communication channels. Ingest supplier confirmations via Gmail inbox and GSM SIM modem, match purchase orders automatically, and dispatch notifications.
          </p>
        </div>

        {/* Live Channel Status Pills */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Gmail Status Pill */}
          <div className={`px-3 py-2 rounded-2xl border flex items-center gap-2 ${
            isGmailConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              : 'bg-amber-900/5 border-amber-900/10 text-amber-900/70'
          }`}>
            <Icons.Mail className={`w-4 h-4 ${isGmailConnected ? 'text-emerald-600' : 'text-amber-900/50'}`} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">Gmail Channel</p>
              <p className="text-xs font-extrabold leading-none mt-0.5">
                {isGmailConnected ? (gmailStatus.account?.email || 'Connected') : 'Not Connected'}
              </p>
            </div>
            <span className={`w-2 h-2 rounded-full ml-1 ${isGmailConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
          </div>

          {/* SIM / SMS Status Pill */}
          <div className={`px-3 py-2 rounded-2xl border flex items-center gap-2 ${
            isSmsConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
              : 'bg-amber-900/5 border-amber-900/10 text-amber-900/70'
          }`}>
            <Icons.SimCard className={`w-4 h-4 ${isSmsConnected ? 'text-emerald-600' : 'text-amber-900/50'}`} />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">SMS Channel</p>
              <p className="text-xs font-extrabold leading-none mt-0.5">
                {isSmsConnected
                  ? smsStatus.provider === 'semaphore'
                    ? `Semaphore · ${smsStatus.accountName || 'Connected'}`
                    : `${smsStatus.port || 'COM4'} (${smsStatus.sim_state?.replace('+CPIN:', '').trim() || 'READY'})`
                  : 'Not Connected'}
              </p>
            </div>
            <span className={`w-2 h-2 rounded-full ml-1 ${isSmsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-amber-900/5 border border-amber-900/10 overflow-x-auto">
        {[
          { id: 'all', label: 'All Channels', icon: Icons.MessageSquare },
          { id: 'email', label: 'Email (Gmail)', icon: Icons.Mail },
          { id: 'sim', label: 'SIM & GSM (SMS)', icon: Icons.SimCard },
          { id: 'suppliers', label: 'Supplier Directory', icon: Icons.Users },
          { id: 'guides', label: 'Setup Guides', icon: Icons.Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                  : 'text-[#693F27] hover:bg-amber-900/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: ALL CHANNELS */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          <GmailPanel ingredients={[]} />
          <SimSetupPanel suppliers={supplierList} settings={settings} onUpdateSettings={onUpdateSettings} />
        </div>
      )}

      {/* TAB CONTENT: EMAIL ONLY */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <GmailPanel ingredients={[]} />
        </div>
      )}

      {/* TAB CONTENT: SIM / SMS ONLY */}
      {activeTab === 'sim' && (
        <div className="space-y-6">
          <SimSetupPanel suppliers={supplierList} settings={settings} onUpdateSettings={onUpdateSettings} />
        </div>
      )}

      {/* TAB CONTENT: SUPPLIER DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-900/10 pb-4">
            <div>
              <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                Supplier Contact Matching Directory
              </h4>
              <p className="text-xs text-amber-900/70 font-medium">
                The ingestion engine scans incoming Gmail messages and SMS from these specific email addresses and phone numbers to match PO confirmations.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#693F27] bg-amber-900/10 px-3 py-1 rounded-full shrink-0">
              {supplierList.length} Registered Suppliers
            </span>
          </div>

          <form onSubmit={handleSaveSupplierContacts} className="space-y-3">
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 py-1.5 text-[11px] font-bold text-amber-900/60 uppercase tracking-wider">
              <div className="col-span-4">Supplier Name</div>
              <div className="col-span-4">Email Address (Gmail Ingestion)</div>
              <div className="col-span-4">Phone Number (SIM / SMS Ingestion)</div>
            </div>

            {supplierList.map((sup, idx) => (
              <div key={sup.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-2 rounded-2xl bg-amber-900/[0.02] border border-amber-900/5 items-center">
                <div className="sm:col-span-4">
                  <span className="sm:hidden text-[10px] font-bold text-amber-900/50 block mb-0.5">Supplier Name</span>
                  <input
                    type="text"
                    value={sup.name}
                    disabled
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21] bg-amber-900/5"
                  />
                </div>
                <div className="sm:col-span-4">
                  <span className="sm:hidden text-[10px] font-bold text-amber-900/50 block mb-0.5">Email Address</span>
                  <div className="relative">
                    <input
                      type="email"
                      value={sup.email}
                      placeholder="supplier@email.com"
                      onChange={(e) => {
                        const updated = [...supplierList];
                        updated[idx] = { ...updated[idx], email: e.target.value };
                        setSupplierList(updated);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                    />
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <span className="sm:hidden text-[10px] font-bold text-amber-900/50 block mb-0.5">Phone Number</span>
                  <div className="relative">
                    <input
                      type="tel"
                      value={sup.phone}
                      placeholder="+63 917 123 4567"
                      onChange={(e) => {
                        const updated = [...supplierList];
                        updated[idx] = { ...updated[idx], phone: e.target.value };
                        setSupplierList(updated);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                    />
                  </div>
                </div>
              </div>
            ))}

            {supplierList.length === 0 && (
              <p className="text-xs text-amber-900/40 font-medium text-center py-6">
                No suppliers registered yet. Add suppliers in Inventory &gt; Suppliers.
              </p>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-amber-900/10">
              <button
                type="submit"
                disabled={saving || supplierList.length === 0}
                className="px-6 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving Directory...' : 'Save Supplier Contacts'}
              </button>
              {savedMsg && <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">{savedMsg}</span>}
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: GUIDES & TUTORIALS */}
      {activeTab === 'guides' && (
        <div className="space-y-6">
          {/* SIM & GSM Bridge Guide */}
          <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-900/10 text-[#693F27] flex items-center justify-center">
                <Icons.SimCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                  Hardware Guide: Setup USB GSM Modem & SIM Card
                </h4>
                <p className="text-xs text-amber-900/70 font-medium">
                  Follow these steps to plug in your USB SIM modem and start the Python bridge service.
                </p>
              </div>
            </div>

            <ol className="space-y-3 pt-2">
              {[
                ['1. Insert SIM Card & Plug in USB Modem', 'Insert an active SIM card (with load / SMS subscription) into your USB GSM modem (SIMCOM SIM800/SIM900, Wavecom, or Huawei USB Dongle) and plug it into your computer USB port.'],
                ['2. Check the COM Port in Device Manager', 'Open Windows Device Manager → Ports (COM & LPT). Note down your modem port (e.g. COM3, COM4, or /dev/ttyUSB0 on Linux).'],
                ['3. Install Python Serial Dependency', 'Open terminal in the project directory and install pyserial:\npip install pyserial requests'],
                ['4. Launch the SMS Bridge Service', 'Start the bridge in terminal:\npython sms/bridge.py\n(Optional environment overrides: SMS_MODEM_PORT=COM4 SMS_MODEM_BAUD=9600 python sms/bridge.py)'],
                ['5. Verify Live Status in Brewtura', 'The SIM card indicator above will turn green ("Modem Online"), showing SIM CPIN status, signal meter, and device model.'],
              ].map(([title, desc], i) => (
                <li key={i} className="p-3.5 rounded-2xl bg-[#FFFDF9]/90 border border-amber-900/10 text-xs">
                  <p className="font-bold text-[#3C2A21]">{title}</p>
                  <p className="text-amber-900/70 mt-1 whitespace-pre-line font-mono text-[11px] bg-amber-900/5 p-2 rounded-xl border border-amber-900/5">
                    {desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Gmail API Setup Guide */}
          <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-900/10 text-[#693F27] flex items-center justify-center">
                  <Icons.Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">
                    Cloud Guide: Connect Gmail API OAuth
                  </h4>
                  <p className="text-xs text-amber-900/70 font-medium">
                    Connect your shop Gmail inbox using Google Cloud OAuth credentials.
                  </p>
                </div>
              </div>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 transition-all inline-flex items-center gap-1.5"
              >
                Open Google Cloud Console ↗
              </a>
            </div>

            <ol className="space-y-3 pt-2">
              {[
                ['Create a Google Cloud project', 'Go to Google Cloud Console → select a project (or create a new one). Free tier is completely sufficient.'],
                ['Enable the Gmail API', 'In the project, open "APIs & Services" → "Library", search for Gmail API and click Enable.'],
                ['Create OAuth credentials', 'Open "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID". Choose Desktop app, then click Create.'],
                ['Copy the Client ID & Secret', 'On the credential you created, copy the Client ID and Client Secret.'],
                ['Add the redirect URI', 'Under the credential, add Authorized redirect URI: http://localhost:5000/api/v1/gmail/callback'],
                ['Put the keys in the .env file', 'Edit the .env file in the project root: GMAIL_CLIENT_ID=... and GMAIL_CLIENT_SECRET=...'],
                ['Restart backend & click Connect Gmail', 'Restart backend server, navigate to the Email tab and click Connect Gmail, then complete the Google sign-in prompt.'],
              ].map(([title, desc], i) => (
                <li key={i} className="flex gap-3 p-3.5 rounded-2xl bg-[#FFFDF9]/90 border border-amber-900/10 text-xs">
                  <span className="w-6 h-6 rounded-full bg-[#3C2A21] text-amber-100 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-[#3C2A21]">{title}</p>
                    <p className="text-amber-900/70 mt-0.5 text-[11px]">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationsSetupPage;
