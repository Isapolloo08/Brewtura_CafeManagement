import React from 'react';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'danger' }) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-5 border border-white/60 text-[#3C2A21] text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <Icons.Trash className="w-5 h-5 text-red-600" />
        </div>

        <div>
          <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">{title || 'Confirm Delete'}</h3>
          <p className="text-xs text-amber-900/60 font-medium mt-1">{message || 'Are you sure you want to delete this item? This action cannot be undone.'}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/20 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30 hover:brightness-110 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
