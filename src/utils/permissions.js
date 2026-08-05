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
