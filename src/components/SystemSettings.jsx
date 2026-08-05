import React from 'react';
import api from '../services/api.js';
import { Icons } from './Icons';
import { TaxSettingsPage } from './TaxSettingsPage';
import { ReceiptLayoutPage } from './ReceiptLayoutPage';
import { PrinterSettingsPage } from './PrinterSettingsPage';
import { PaymentGatewaysPage } from './PaymentGatewaysPage';
import { BackupPage } from './BackupPage';
import { EmailSetupPage } from './EmailSetupPage';
import { BranchesPage } from './BranchesPage';

const PAGE_INFO = {
  tax_vat: {
    badge: 'System Settings',
    title: 'Tax & Service Charge Settings',
    desc: 'Configure your regional tax requirements and service fee structures. These settings will be applied globally across all point-of-sale terminals and digital menus.',
  },
  branches: {
    badge: 'System Settings',
    title: 'Branches',
    desc: 'Manage your store locations. Branches are used across shift logs, staff assignments, and reports.',
  },
  receipt_layout: {
    badge: 'System Settings',
    title: 'Receipt Customizer',
    desc: 'Customize the layout and content of printed receipts.',
  },
  hardware_printers: {
    badge: 'System Settings',
    title: 'Printer Configuration',
    desc: 'Manage your hardware endpoints and paper dimensions. Ensure all thermal printers are connected to the same local subnet as this terminal.',
  },
  payment_gateways: {
    badge: 'System Settings',
    title: 'Payment Gateways',
    desc: 'Manage how your customers pay. Enable digital wallets, card processing, and synchronize your physical till with the Brewtura cloud terminal.',
  },
  database_backup: {
    badge: 'System Settings',
    title: 'Data Integrity & Backups',
    desc: 'Manage automated and manual backups, restore points, and integrity verification for your shop data.',
  },
  email_setup: {
    badge: 'System Settings',
    title: 'Email Setup',
    desc: 'Connect a Gmail inbox so supplier replies and deliveries come straight into the system.',
  },
};

function TitleBar({ info }) {
  return (
    <div className="glass-card p-6 rounded-3xl border border-white/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <span className="inline-block px-3 py-1 rounded-full bg-[#3C2A21]/10 text-[#693F27] text-[10px] font-extrabold uppercase tracking-widest mb-2">
          {info.badge}
        </span>
        <h1 className="font-heading font-extrabold text-2xl text-[#3C2A21] tracking-tight">
          {info.title}
        </h1>
        <p className="text-xs text-[#3C2A21]/50 font-medium mt-0.5">
          {info.desc}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shadow-inner">
          <Icons.Settings className="w-5 h-5 text-[#693F27]" />
        </div>
      </div>
    </div>
  );
}

export function SystemSettings({ settings, onUpdateSettings, activeSubTab, can, ingredients, recipeTemplates, onRefreshRecipeTemplates, suppliers }) {
  const tab = activeSubTab || 'tax_vat';
  const info = PAGE_INFO[tab] || PAGE_INFO.tax_vat;

  const renderPage = () => {
    switch (tab) {
      case 'branches':
        return <BranchesPage can={can} />;
      case 'tax_vat':
        return <TaxSettingsPage settings={settings} onUpdateSettings={async (updated) => { onUpdateSettings(updated); try { await api.updateSettings(updated); } catch(e){} }} />;
      case 'receipt_layout':
        return <ReceiptLayoutPage settings={settings} onUpdateSettings={async (updated) => { onUpdateSettings(updated); try { await api.updateSettings(updated); } catch(e){} }} ingredients={ingredients} recipeTemplates={recipeTemplates} onRefreshRecipeTemplates={onRefreshRecipeTemplates} />;
      case 'hardware_printers':
        return <PrinterSettingsPage settings={settings} onUpdateSettings={async (updated) => { onUpdateSettings(updated); try { await api.updateSettings(updated); } catch(e){} }} />;
      case 'payment_gateways':
        return <PaymentGatewaysPage settings={settings} onUpdateSettings={async (updated) => { onUpdateSettings(updated); try { await api.updateSettings(updated); } catch(e){} }} />;
      case 'database_backup':
        return <BackupPage />;
      case 'email_setup':
        return <EmailSetupPage suppliers={suppliers || []} />;
      default:
        return <TaxSettingsPage settings={settings} onUpdateSettings={async (updated) => { onUpdateSettings(updated); try { await api.updateSettings(updated); } catch(e){} }} />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <TitleBar info={info} />
      {renderPage()}
    </div>
  );
}