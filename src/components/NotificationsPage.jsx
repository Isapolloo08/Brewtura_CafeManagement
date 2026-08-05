import React from 'react';

const NOTIFICATIONS = [
  { id: 1, title: 'Low Stock Alert', message: 'House Blend Coffee Beans is below minimum threshold.', time: '2 min ago', type: 'warning' },
  { id: 2, title: 'Shift Reconciliation', message: 'Julian Chen closed shift with $0.00 variance.', time: '15 min ago', type: 'success' },
  { id: 3, title: 'New Order', message: 'Order #105 is ready for pickup.', time: '20 min ago', type: 'info' },
  { id: 4, title: 'Purchase Order', message: 'PO-8822 from Green Valley Dairy is in transit.', time: '1 hr ago', type: 'info' },
  { id: 5, title: 'Spoilage Report', message: '2L of Fresh Whole Milk was marked as spoiled.', time: '2 hr ago', type: 'warning' },
  { id: 6, title: 'System Update', message: 'Backup completed successfully at 04:00 AM.', time: '5 hr ago', type: 'success' },
  { id: 7, title: 'Printer Error', message: 'Kitchen printer is disconnected. Check network.', time: '1 day ago', type: 'error' },
];

const TYPE_STYLES = {
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-900',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-900',
  error: 'bg-red-500/10 border-red-500/20 text-red-900',
};

const TYPE_ICON = {
  warning: '!',
  success: '\u2713',
  info: 'i',
  error: '\u2717',
};

export function NotificationsPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Notifications</h2>
          <p className="text-xs text-amber-900/55 font-medium">System alerts and updates</p>
        </div>
        <span className="text-xs text-amber-900/40 font-medium">{NOTIFICATIONS.length} notifications</span>
      </div>

      {/* Alert Severity Distribution */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900/60">Alert Severity Distribution</span>
          <span className="text-[10px] font-bold text-amber-900/40">{NOTIFICATIONS.length} total alerts</span>
        </div>
        <div className="space-y-2">
          {['warning', 'success', 'info', 'error'].map(type => {
            const count = NOTIFICATIONS.filter(n => n.type === type).length;
            const pct = Math.round((count / NOTIFICATIONS.length) * 100);
            if (count === 0) return null;
            return (
              <div key={type}>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className={`${type === 'warning' ? 'text-amber-700' : type === 'success' ? 'text-emerald-700' : type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span className="text-amber-900/50">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-progress-in ${
                      type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                      type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                      type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                      'bg-gradient-to-r from-blue-500 to-indigo-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`glass-card rounded-2xl border p-4 flex items-start gap-4 ${TYPE_STYLES[n.type]}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
              n.type === 'warning' ? 'bg-amber-500/20' :
              n.type === 'success' ? 'bg-emerald-500/20' :
              n.type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}>
              {TYPE_ICON[n.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold">{n.title}</p>
              <p className="text-[11px] font-medium opacity-80 mt-0.5">{n.message}</p>
            </div>
            <span className="text-[10px] font-medium opacity-50 shrink-0">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
