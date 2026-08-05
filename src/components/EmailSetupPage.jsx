import React, { useState, useEffect } from 'react';
import { GmailPanel } from './GmailPanel';
import api from '../services/api.js';

export function EmailSetupPage({ suppliers }) {
  const [supplierList, setSupplierList] = useState(suppliers || []);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      setSupplierList(suppliers);
      return;
    }
    api.getSuppliers()
      .then(list => setSupplierList(list.map(s => ({
        id: String(s.id),
        name: s.name,
        email: s.email || '',
      }))))
      .catch(() => {});
  }, [suppliers]);

  const handleSaveSupplierEmails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      for (const s of supplierList) {
        if (s.id && !s.id.startsWith('sup-')) {
          await api.createSupplier({ name: s.name, email: s.email });
        }
      }
      setSavedMsg('Supplier email addresses saved successfully.');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      console.warn('Failed to save supplier emails:', err);
      setSavedMsg('Failed to save. Check server connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="glass-card p-6 rounded-3xl border border-white/60">
        <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
          System Settings
        </span>
        <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Email Setup</h2>
        <p className="text-xs text-amber-900/70 font-medium mt-0.5">
          Connect your Gmail inbox so supplier replies come straight into the system. Once connected, the Purchase Orders page uses the same account automatically.
        </p>
      </div>

      <GmailPanel ingredients={[]} />

      <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-4">
        <div>
          <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">Supplier Email Addresses</h4>
          <p className="text-xs text-amber-900/70 font-medium">
            The system only ingests emails coming from these suppliers. Add their addresses so replies are matched correctly.
          </p>
        </div>

        <form onSubmit={handleSaveSupplierEmails} className="space-y-3">
          {supplierList.map((sup, idx) => (
            <div key={sup.id || idx} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={sup.name}
                  disabled
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21] bg-amber-900/5"
                />
              </div>
              <div className="flex-1">
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
          ))}

          {supplierList.length === 0 && (
            <p className="text-xs text-amber-900/40 font-medium text-center py-2">
              No suppliers yet. Add suppliers in Inventory &gt; Suppliers.
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || supplierList.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Supplier Emails'}
            </button>
            {savedMsg && <span className="text-xs font-bold text-emerald-700">{savedMsg}</span>}
          </div>
        </form>
      </div>

      <div className="glass-card rounded-3xl border border-white/60 p-6">
        <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">How it works</h4>
        <ol className="mt-3 space-y-2 text-xs text-amber-900/70 font-medium list-decimal list-inside">
          <li>Connect a Gmail inbox using the Connect Gmail button.</li>
          <li>The system scans that inbox for unread supplier replies containing a PO code (e.g. <b>PO-1234</b>).</li>
          <li>It extracts the items being delivered from the message and saves them to the system.</li>
          <li>Open <b>Inventory &gt; Purchase Orders</b> to see the scanned messages and matched delivery items.</li>
        </ol>
      </div>

      <div className="glass-card rounded-3xl border border-white/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="font-heading font-extrabold text-lg text-[#3C2A21]">Tutorial: Connect Gmail</h4>
            <p className="text-xs text-amber-900/70 font-medium">
              Follow these steps once to enable incoming supplier emails. This requires a Google Cloud project.
            </p>
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

        <ol className="space-y-3">
          {[
            ['Create a Google Cloud project', 'Go to Google Cloud Console → select a project (or create a new one). You may be asked to enable billing (free tier is fine).'],
            ['Enable the Gmail API', 'In the project, open "APIs & Services" → "Library", search for Gmail API and click Enable.'],
            ['Create OAuth credentials', 'Open "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID". Choose Application type = Desktop app, then click Create.'],
            ['Copy the Client ID & Secret', 'On the credential you created, copy the Client ID and Client Secret.'],
            ['Add the redirect URI', 'Under the same credential, add an Authorized redirect URI: http://localhost:5000/api/v1/gmail/callback'],
            ['Put the keys in the .env file', 'Edit the .env file at the project root and add: GMAIL_CLIENT_ID=..., GMAIL_CLIENT_SECRET=..., GMAIL_REDIRECT_URI=http://localhost:5000/api/v1/gmail/callback'],
            ['Restart & connect', 'Restart the backend server, return to this page and click Connect Gmail, then approve the Google sign-in.'],
          ].map(([title, desc], i) => (
            <li key={i} className="flex gap-3 p-3 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10 text-xs">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#3C2A21] text-amber-100 text-[11px] font-extrabold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-[#3C2A21]">{title}</p>
                <p className="text-amber-900/70 font-medium mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
