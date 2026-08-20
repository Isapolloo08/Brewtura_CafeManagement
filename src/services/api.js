const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Clears the stored session and tells the app to go back to the login screen
// when the server rejects our token (expired, invalid, or revoked).
function handleAuthExpired(message) {
  localStorage.removeItem('coffee_token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isLoggedIn');
  window.dispatchEvent(new CustomEvent('coffee:auth-expired', { detail: { message } }));
}

// Helper for HTTP requests with optional Auth Header
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('coffee_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/pin-login');
    if (token && !isAuthEndpoint) {
      if (response.status === 403) {
        handleAuthExpired('Your session has expired. Please log in again to continue.');
      } else if (response.status === 401) {
        handleAuthExpired();
      }
    }
    const error = new Error(data.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  pinLogin: (pinData) => fetchAPI('/auth/pin-login', { method: 'POST', body: JSON.stringify(pinData) }),
  forgotPassword: (data) => fetchAPI('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data) => fetchAPI('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchAPI('/auth/me'),
  updateMe: (data) => fetchAPI('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => fetchAPI('/users'),
  getUser: (id) => fetchAPI(`/users/${id}`),
  createUser: (userData) => fetchAPI('/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id, userData) => fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  deleteUser: (id) => fetchAPI(`/users/${id}`, { method: 'DELETE' }),

  // Menu
  getCategories: () => fetchAPI('/menu/categories'),
  createCategory: (data) => fetchAPI('/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => fetchAPI(`/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => fetchAPI(`/menu/categories/${id}`, { method: 'DELETE' }),

  getProducts: () => fetchAPI('/menu/products'),
  createProduct: (data) => fetchAPI('/menu/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => fetchAPI(`/menu/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => fetchAPI(`/menu/products/${id}`, { method: 'DELETE' }),
  getCustomizationTemplates: () => fetchAPI('/menu/customization-templates'),
  createCustomizationTemplate: (data) => fetchAPI('/menu/customization-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomizationTemplate: (id, data) => fetchAPI(`/menu/customization-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomizationTemplate: (id) => fetchAPI(`/menu/customization-templates/${id}`, { method: 'DELETE' }),
  createCustomization: (data) => fetchAPI('/menu/customizations', { method: 'POST', body: JSON.stringify(data) }),
  getCustomizationRecipes: (id) => fetchAPI(`/menu/customizations/${id}/recipes`),

  getAddons: () => fetchAPI('/menu/addons'),
  createAddon: (data) => fetchAPI('/menu/addons', { method: 'POST', body: JSON.stringify(data) }),
  updateAddon: (id, data) => fetchAPI(`/menu/addons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAddon: (id) => fetchAPI(`/menu/addons/${id}`, { method: 'DELETE' }),

  getTemperatureOptions: () => fetchAPI('/menu/temperatures'),
  createTemperatureOption: (data) => fetchAPI('/menu/temperatures', { method: 'POST', body: JSON.stringify(data) }),
  updateTemperatureOption: (id, data) => fetchAPI(`/menu/temperatures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemperatureOption: (id) => fetchAPI(`/menu/temperatures/${id}`, { method: 'DELETE' }),

  getMilkOptions: () => fetchAPI('/menu/milks'),
  createMilkOption: (data) => fetchAPI('/menu/milks', { method: 'POST', body: JSON.stringify(data) }),
  updateMilkOption: (id, data) => fetchAPI(`/menu/milks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMilkOption: (id) => fetchAPI(`/menu/milks/${id}`, { method: 'DELETE' }),

  // Inventory
  getIngredients: () => fetchAPI('/inventory/ingredients'),
  createIngredient: (data) => fetchAPI('/inventory/ingredients', { method: 'POST', body: JSON.stringify(data) }),
  updateIngredient: (id, data) => fetchAPI(`/inventory/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIngredient: (id) => fetchAPI(`/inventory/ingredients/${id}`, { method: 'DELETE' }),

  getStockMovements: () => fetchAPI('/inventory/stock-movements'),
  recordStockMovement: (data) => fetchAPI('/inventory/stock-movements', { method: 'POST', body: JSON.stringify(data) }),
  stockInFromPo: (data) => fetchAPI('/inventory/stock-in-from-po', { method: 'POST', body: JSON.stringify(data) }),
  reverseStockFromPo: (data) => fetchAPI('/inventory/reverse-stock-from-po', { method: 'POST', body: JSON.stringify(data) }),

  getSuppliers: () => fetchAPI('/inventory/suppliers'),
  createSupplier: (data) => fetchAPI('/inventory/suppliers', { method: 'POST', body: JSON.stringify(data) }),

  // Purchase Orders
  getPurchaseOrders: () => fetchAPI('/purchase-orders'),
  createPurchaseOrder: (data) => fetchAPI('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrderStatus: (id, status) => fetchAPI(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updatePurchaseOrder: (id, data) => fetchAPI(`/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePurchaseOrder: (id) => fetchAPI(`/purchase-orders/${id}`, { method: 'DELETE' }),

  // Gmail Integration
  getGmailStatus: () => fetchAPI('/gmail/status'),
  getGmailAuthUrl: () => fetchAPI('/gmail/auth-url'),
  pollGmail: () => fetchAPI('/gmail/poll', { method: 'POST' }),
  getGmailMessages: () => fetchAPI('/gmail/messages'),
  sendGmailEmail: (data) => fetchAPI('/gmail/send', { method: 'POST', body: JSON.stringify(data) }),
  disconnectGmail: () => fetchAPI('/gmail/disconnect', { method: 'POST' }),

  // SMS & SIM Bridge Integration
  getSmsStatus: () => fetchAPI('/sms/status'),
  getSmsStats: () => fetchAPI('/sms/stats'),
  pollSms: () => fetchAPI('/sms/poll', { method: 'POST' }),
  getSmsMessages: () => fetchAPI('/sms/messages'),
  sendSms: (data) => fetchAPI('/sms/send', { method: 'POST', body: JSON.stringify(data) }),

  // Recipes
  createRecipeItem: (data) => fetchAPI('/inventory/recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateProductRecipe: (productId, items) => fetchAPI(`/inventory/recipes/product/${productId}`, { method: 'PUT', body: JSON.stringify({ items }) }),

  // Recipe Library
  getRecipeTemplates: () => fetchAPI('/inventory/recipe-templates'),
  createRecipeTemplate: (data) => fetchAPI('/inventory/recipe-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipeTemplate: (id, data) => fetchAPI(`/inventory/recipe-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipeTemplate: (id) => fetchAPI(`/inventory/recipe-templates/${id}`, { method: 'DELETE' }),

  // Orders & POS
  getOrders: (params = '') => fetchAPI(`/orders${params ? '?' + params : ''}`),
  getTransactions: (params = '') => fetchAPI(`/orders/transactions${params ? '?' + params : ''}`),
  createOrder: (orderData) => fetchAPI('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  updateOrderStatus: (id, status) => fetchAPI(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getOrderByToken: (token) => fetchAPI(`/orders/token/${token}`),

  // Payments & Discounts
  recordPayment: (paymentData) => fetchAPI('/payments/payments', { method: 'POST', body: JSON.stringify(paymentData) }),
  getDiscounts: () => fetchAPI('/payments/discounts'),
  createDiscount: (data) => fetchAPI('/payments/discounts', { method: 'POST', body: JSON.stringify(data) }),

  // Shifts
  getShifts: () => fetchAPI('/shifts'),
  getBranches: () => fetchAPI('/shifts/branches'),
  getCurrentShift: () => fetchAPI('/shifts/current'),
  getShiftReport: (id) => fetchAPI(`/shifts/${id}/report`),
  openShift: (data) => fetchAPI('/shifts/open', { method: 'POST', body: JSON.stringify(data) }),
  closeShift: (data) => fetchAPI('/shifts/close', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id, data) => fetchAPI(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordCashMovement: (data) => fetchAPI('/shifts/cash-movement', { method: 'POST', body: JSON.stringify(data) }),

  // Branches
  listBranches: () => fetchAPI('/branches'),
  createBranch: (data) => fetchAPI('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => fetchAPI(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id) => fetchAPI(`/branches/${id}`, { method: 'DELETE' }),
  hardDeleteBranch: (id) => fetchAPI(`/branches/${id}/hard`, { method: 'DELETE' }),

  // Reports & Settings
  getDashboardStats: () => fetchAPI('/reports/dashboard-stats'),
  getBestSellers: (params = '') => fetchAPI(`/reports/best-sellers${params ? '?' + params : ''}`),
  getSalesByHour: (params = '') => fetchAPI(`/reports/sales-by-hour${params ? '?' + params : ''}`),
  getSalesReport: (params = '') => fetchAPI(`/reports/sales${params ? '?' + params : ''}`),
  getSettings: () => fetchAPI('/reports/settings'),
  updateSettings: (data) => fetchAPI('/reports/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export default api;
