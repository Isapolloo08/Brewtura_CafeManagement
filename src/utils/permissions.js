export const PERMISSION_RESOURCES = [
  'menu',
  'ingredients',
  'stock_movements',
  'purchase_orders',
  'suppliers',
  'staff',
  'branches',
  'settings',
];

const ACTIONS = ['add', 'edit', 'delete', 'assign'];

const MATRIX = {
  Administrator: null,
  Manager: {
    menu: ['add', 'edit', 'delete'],
    ingredients: ['add', 'edit', 'delete'],
    stock_movements: ['add', 'edit', 'delete'],
    purchase_orders: ['add', 'edit', 'delete'],
    suppliers: ['add', 'edit', 'delete'],
    staff: ['add', 'edit', 'delete'],
    branches: ['assign'],
    settings: [],
  },
  'Inventory Staff': {
    menu: [],
    ingredients: ['add', 'edit'],
    stock_movements: ['add'],
    purchase_orders: ['add', 'edit'],
    suppliers: ['add', 'edit'],
    staff: [],
    branches: [],
    settings: [],
  },
  Cashier: {
    menu: [],
    ingredients: [],
    stock_movements: [],
    purchase_orders: [],
    suppliers: [],
    staff: [],
    branches: [],
    settings: [],
  },
  Barista: {
    menu: [],
    ingredients: [],
    stock_movements: [],
    purchase_orders: [],
    suppliers: [],
    staff: [],
    branches: [],
    settings: [],
  },
};

const ROLE_ALIASES = {
  admin: 'Administrator',
  administrator: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  barista: 'Barista',
  stock_clerk: 'Inventory Staff',
  inventory: 'Inventory Staff',
  'inventory staff': 'Inventory Staff',
};

export const normalizeRole = (role) => {
  if (!role) return 'Administrator';
  const key = String(role).toLowerCase().trim();
  return ROLE_ALIASES[key] || role;
};

export const can = (role, resource, action = 'add') => {
  const r = normalizeRole(role);
  if (r === 'Administrator') return true;
  if (!ACTIONS.includes(action)) return false;
  const allowed = MATRIX[r] && MATRIX[r][resource];
  return Array.isArray(allowed) && allowed.includes(action);
};

export const allowedActions = (role, resource) => {
  const r = normalizeRole(role);
  if (r === 'Administrator') return [...ACTIONS];
  const allowed = MATRIX[r] && MATRIX[r][resource];
  return Array.isArray(allowed) ? [...allowed] : [];
};

// ─── Page-level access control ───
// Which top-level pages each (normalized display) role may open. Administrator
// always passes; sub-pages are gated separately via SETTINGS_SUB_ACCESS.
const PAGE_ACCESS = {
  dashboard: ['Administrator', 'Manager', 'Cashier', 'Barista', 'Inventory Staff'],
  menu: ['Administrator', 'Manager'],
  inventory: ['Administrator', 'Manager', 'Inventory Staff'],
  kitchen: ['Administrator', 'Manager', 'Cashier', 'Barista'],
  transactions: ['Administrator', 'Manager', 'Cashier'],
  reports: ['Administrator', 'Manager'],
  users: ['Administrator', 'Manager'],
  settings: ['Administrator', 'Manager'],
  profile: ['Administrator', 'Manager', 'Cashier', 'Barista', 'Inventory Staff'],
  live_view: ['Administrator', 'Manager', 'Cashier', 'Barista'],
  shift_log: ['Administrator', 'Manager', 'Cashier'],
  notifications: ['Administrator', 'Manager', 'Cashier', 'Barista', 'Inventory Staff'],
  activity_history: ['Administrator', 'Manager'],
};

const SETTINGS_SUB_ACCESS = {
  branches: ['Administrator', 'Manager'],
  tax_vat: ['Administrator'],
  receipt_layout: ['Administrator'],
  branding: ['Administrator'],
  hardware_printers: ['Administrator'],
  payment_gateways: ['Administrator'],
  communications: ['Administrator', 'Manager'],
  email_setup: ['Administrator', 'Manager'],
  database_backup: ['Administrator'],
};

export const canAccessPage = (role, tab, sub) => {
  const r = normalizeRole(role);
  if (r === 'Administrator') return true;
  if (tab === 'settings') {
    // Require an explicit sub-page; with none chosen the default sub is
    // admin-only, so deny to avoid leaking it.
    if (!sub) return false;
    return (SETTINGS_SUB_ACCESS[sub] || []).includes(r);
  }
  const allowed = PAGE_ACCESS[tab];
  return Array.isArray(allowed) && allowed.includes(r);
};
