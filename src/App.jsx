import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CategoriesPage } from './components/CategoriesPage';
import { ProductsPage } from './components/ProductsPage';
import { CustomizationsPage } from './components/CustomizationsPage';
import { RecipesPage } from './components/RecipesPage';
import { InventoryManagement } from './components/InventoryManagement';
import { IngredientsPage } from './components/IngredientsPage';
import { StockMovementsPage } from './components/StockMovementsPage';
import { PurchaseOrdersPage } from './components/PurchaseOrdersPage';
import { SuppliersPage } from './components/SuppliersPage';
import { SalesReportPage } from './components/SalesReportPage';
import { BestSellersPage } from './components/BestSellersPage';
import { InventoryValuationPage } from './components/InventoryValuationPage';
import { ShiftReconciliationPage } from './components/ShiftReconciliationPage';
import { SystemSettings } from './components/SystemSettings';
import { UserManagement } from './components/UserManagement';
import { KitchenDisplay } from './components/KitchenDisplay';
import { LiveViewPage } from './components/LiveViewPage';
import { ShiftLogPage } from './components/ShiftLogPage';
import { NotificationsPage } from './components/NotificationsPage';
import { ActivityHistoryPage } from './components/ActivityHistoryPage';
import { ProfilePage } from './components/ProfilePage';
import { CreateProductModal } from './components/CreateProductModal';
import { SupplierScanAlert } from './components/SupplierScanAlert';
import { TransactionsPage } from './components/TransactionsPage';



import api from './services/api.js';
import { socket } from './services/socket.js';
import { can as roleCan, canAccessPage } from './utils/permissions.js';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : {
      id: 'emp-101',
      name: 'Marco V.',
      role: 'Administrator',
      employeeId: 'ADM-001',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=90'
    };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('Daily');
  const [loading, setLoading] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customizationTemplates, setCustomizationTemplates] = useState({ sizes: [], options: [] });
  const [recipeTemplates, setRecipeTemplates] = useState([]);
  const [temperatures, setTemperatures] = useState([]);
  const [milks, setMilks] = useState([]);
  const [addons, setAddons] = useState([]);
  const [movements, setMovements] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({ tax_rate: '0.12', currency: 'PHP', receipt_header: 'Brewtura', receipt_footer: 'Thank you!' });

  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [authNotice, setAuthNotice] = useState(null);

  const [scanAlert, setScanAlert] = useState(null);

  useEffect(() => {
    const onAuthExpired = (e) => {
      setAuthNotice(e.detail?.message || 'Your session has expired. Please log in again.');
      setIsLoggedIn(false);
    };
    window.addEventListener('coffee:auth-expired', onAuthExpired);
    return () => window.removeEventListener('coffee:auth-expired', onAuthExpired);
  }, []);

  useEffect(() => {
    const onSupplierMessage = (message) => {
      if (!message || message.direction === 'out') return;
      setScanAlert(message);
    };
    socket.on('supplier-message', onSupplierMessage);
    return () => {
      socket.off('supplier-message', onSupplierMessage);
    };
  }, []);

  const handleStockUp = async ({ message, provided }) => {
    const res = await api.stockInFromPo({
      poCode: message.po_code || '',
      items: (provided || []).map(it => ({ name: it.name, quantity: it.quantity, unit: it.unit })),
      messageId: message.id,
    });
    try {
      const [ingRes, poRes] = await Promise.allSettled([
        api.getIngredients(),
        api.getPurchaseOrders(),
      ]);
      if (ingRes.status === 'fulfilled' && Array.isArray(ingRes.value)) {
        setIngredients(ingRes.value.map(ing => ({
          id: String(ing.id),
          name: ing.name,
          category: 'General',
          stock: parseFloat(ing.current_stock),
          unit: ing.unit,
          minStock: parseFloat(ing.reorder_threshold),
          maxStock: parseFloat(ing.reorder_threshold) * 10,
          costPerUnit: parseFloat(ing.unit_cost),
          status: parseFloat(ing.current_stock) <= 0
            ? 'Out of Stock'
            : parseFloat(ing.current_stock) <= parseFloat(ing.reorder_threshold)
              ? 'Low Stock'
              : 'In Stock'
        })));
      }
      if (poRes.status === 'fulfilled' && Array.isArray(poRes.value)) {
        setPurchaseOrders(poRes.value.map(po => ({
          id: po.id,
          supplier: po.supplier,
          supplierEmail: po.supplierEmail || '',
          date: po.date || '',
          expectedDelivery: po.expectedDelivery || '',
          totalCost: parseFloat(po.totalCost) || 0,
          status: po.status || 'Pending Approval',
          itemsList: po.itemsList || [],
        })));
      }
    } catch (err) {
      console.warn('refresh after stock-up failed:', err.message);
    }
    socket.emit('supplier-message-refresh');
    setScanAlert(prev => prev ? { ...prev, stocked_at: new Date().toISOString() } : prev);
    return res;
  };

  const mapPurchaseOrders = (list) => (Array.isArray(list) ? list : []).map(po => ({
    id: po.id,
    supplier: po.supplier,
    supplierEmail: po.supplierEmail || '',
    date: po.date || '',
    expectedDelivery: po.expectedDelivery || '',
    totalCost: parseFloat(po.totalCost) || 0,
    status: po.status || 'Pending Approval',
    itemsList: po.itemsList || [],
  }));

  const refreshPurchaseOrders = async () => {
    try {
      const res = await api.getPurchaseOrders();
      setPurchaseOrders(mapPurchaseOrders(res));
    } catch (err) {
      console.warn('refresh purchase orders failed:', err.message);
    }
  };

  const handleReverseStock = async ({ message }) => {
    const res = await api.reverseStockFromPo({ poCode: message.po_code || '' });
    try {
      const [ingRes, poRes] = await Promise.allSettled([
        api.getIngredients(),
        api.getPurchaseOrders(),
      ]);
      if (ingRes.status === 'fulfilled' && Array.isArray(ingRes.value)) {
        setIngredients(ingRes.value.map(ing => ({
          id: String(ing.id),
          name: ing.name,
          category: 'General',
          stock: parseFloat(ing.current_stock),
          unit: ing.unit,
          minStock: parseFloat(ing.reorder_threshold),
          maxStock: parseFloat(ing.reorder_threshold) * 10,
          costPerUnit: parseFloat(ing.unit_cost),
          status: parseFloat(ing.current_stock) <= 0
            ? 'Out of Stock'
            : parseFloat(ing.current_stock) <= parseFloat(ing.reorder_threshold)
              ? 'Low Stock'
              : 'In Stock'
        })));
      }
      if (poRes.status === 'fulfilled' && Array.isArray(poRes.value)) {
        setPurchaseOrders(poRes.value.map(po => ({
          id: po.id,
          supplier: po.supplier,
          supplierEmail: po.supplierEmail || '',
          date: po.date || '',
          expectedDelivery: po.expectedDelivery || '',
          totalCost: parseFloat(po.totalCost) || 0,
          status: po.status || 'Pending Approval',
          itemsList: po.itemsList || [],
        })));
      }
    } catch (err) {
      console.warn('refresh after reverse failed:', err.message);
    }
    socket.emit('supplier-message-refresh');
    return res;
  };

  // For the global alert modal: find items previously stocked on the alert's PO
  // (receivedQty > 0) that the latest reply now lists as missing/unavailable.
  const scanAlertContradiction = (() => {
    if (!scanAlert || !scanAlert.po_code) return [];
    const norm = (c) => (c || '').replace(/[^0-9PO]/gi, '').toUpperCase();
    const po = purchaseOrders.find(p => norm(p.id) === norm(scanAlert.po_code));
    if (!po) return [];
    let missing = [];
    if (typeof scanAlert.analysis === 'string') {
      try { missing = JSON.parse(scanAlert.analysis)?.missingItems || []; } catch { missing = []; }
    } else {
      missing = scanAlert.analysis?.missingItems || [];
    }
    const missingNames = new Set((missing || []).map(m => String(m.name || '').toLowerCase()));
    return (po.itemsList || [])
      .filter(it => (parseFloat(it.receivedQty) || 0) > 0 && missingNames.has(String(it.name || '').toLowerCase()))
      .map(it => ({ name: it.name, receivedQty: parseFloat(it.receivedQty) || 0, unit: it.unit || '' }));
  })();

  // Fetch all data exclusively from backend API — no mock fallback
  useEffect(() => {
    const loadBackendData = async () => {
      setLoading(true);
      try {
        const [ingRes, prodRes, catRes, movRes, suppRes, ordRes, empRes, settingsRes, vtRes, rtRes, poRes, tempRes, milkRes, addRes, meRes] = await Promise.allSettled([
          api.getIngredients(),
          api.getProducts(),
          api.getCategories(),
          api.getStockMovements(),
          api.getSuppliers(),
          api.getOrders(),
          api.getUsers(),
          api.getSettings(),
          api.getCustomizationTemplates(),
          api.getRecipeTemplates(),
          api.getPurchaseOrders(),
          api.getTemperatureOptions(),
          api.getMilkOptions(),
          api.getAddons(),
          api.getMe(),
        ]);

        if (ingRes.status === 'fulfilled' && Array.isArray(ingRes.value)) {
          setIngredients(ingRes.value.map(ing => ({
            id: String(ing.id),
            name: ing.name,
            category: 'General',
            stock: parseFloat(ing.current_stock),
            unit: ing.unit,
            minStock: parseFloat(ing.reorder_threshold),
            maxStock: parseFloat(ing.reorder_threshold) * 10,
            costPerUnit: parseFloat(ing.unit_cost),
            status: parseFloat(ing.current_stock) <= 0
              ? 'Out of Stock'
              : parseFloat(ing.current_stock) <= parseFloat(ing.reorder_threshold)
                ? 'Low Stock'
                : 'In Stock'
          })));
        }

        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
          setProducts(prodRes.value.map(p => ({
            id: String(p.id),
            name: p.name,
            category: p.category_name || 'Coffee',
            price: parseFloat(p.base_price),
            status: p.is_active ? 'Available' : 'Unavailable',
            image: p.image_url || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80',
            description: p.description || '',
            customizations: Array.isArray(p.customizations)
              ? p.customizations.map(v => ({ id: v.id ? String(v.id) : undefined, name: v.name, priceDelta: parseFloat(v.price_delta), price_delta: parseFloat(v.price_delta), customization_type: v.customization_type || 'size' }))
              : [],
            recipe: Array.isArray(p.recipe)
              ? p.recipe.map(r => ({
                  ingredientId: r.ingredient_id !== undefined && r.ingredient_id !== null ? String(r.ingredient_id) : undefined,
                  customizationId: r.product_customization_id !== undefined && r.product_customization_id !== null ? String(r.product_customization_id) : null,
                  name: r.ingredient_name,
                  amount: parseFloat(r.qty_required),
                  unit: r.unit
                }))
              : [],
            temperatures: Array.isArray(p.temperatures)
              ? p.temperatures.map(t => ({ id: String(t.id), name: t.name, priceDelta: parseFloat(t.price_delta) }))
              : [],
            milks: Array.isArray(p.milks)
              ? p.milks.map(m => ({ id: String(m.id), name: m.name, priceDelta: parseFloat(m.price_delta) }))
              : [],
            addons: Array.isArray(p.addons)
              ? p.addons.map(a => ({ id: String(a.id), name: a.name, price: parseFloat(a.price) }))
              : []
          })));
        }

        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
          setCategories(catRes.value.map(c => ({
            id: String(c.id),
            name: c.name,
            count: 0,
            status: c.is_active ? 'Active' : 'Inactive'
          })));
        }

        if (vtRes.status === 'fulfilled' && Array.isArray(vtRes.value)) {
          setCustomizationTemplates(splitCustomizationTemplates(vtRes.value));
        }

        if (tempRes.status === 'fulfilled' && Array.isArray(tempRes.value)) {
          setTemperatures(tempRes.value.map(t => ({ id: String(t.id), name: t.name, priceDelta: parseFloat(t.price_delta), stock: t.stock !== undefined ? parseInt(t.stock, 10) : 0 })));
        }

        if (milkRes.status === 'fulfilled' && Array.isArray(milkRes.value)) {
          setMilks(milkRes.value.map(m => ({ id: String(m.id), name: m.name, priceDelta: parseFloat(m.price_delta), stock: m.stock !== undefined ? parseInt(m.stock, 10) : 0 })));
        }

        if (addRes.status === 'fulfilled' && Array.isArray(addRes.value)) {
          setAddons(addRes.value.map(a => ({ id: String(a.id), name: a.name, price: parseFloat(a.price), stock: a.stock !== undefined ? parseInt(a.stock, 10) : 0 })));
        }

        if (rtRes.status === 'fulfilled' && Array.isArray(rtRes.value)) {
          setRecipeTemplates(rtRes.value.map(t => ({
            id: String(t.id),
            name: t.name,
            items: (t.items || []).map(item => ({
              ingredientId: String(item.ingredient_id),
              name: item.ingredient_name,
              unit: item.unit,
              amount: parseFloat(item.qty_required),
            })),
          })));
        }

        if (movRes.status === 'fulfilled' && Array.isArray(movRes.value)) {
          setMovements(movRes.value.map(m => ({
            id: String(m.id),
            ingredientName: m.ingredient_name,
            ingredientId: String(m.ingredient_id),
            type: m.type,
            quantity: `${m.type === 'stock_out' || m.type === 'waste' ? '-' : '+'}${m.quantity}`,
            reason: m.note || m.type,
            timestamp: new Date(m.created_at).toLocaleString(),
            user: m.created_by_user || 'System'
          })));
        }

        if (suppRes.status === 'fulfilled' && Array.isArray(suppRes.value)) {
          setSuppliers(suppRes.value.map(s => ({
            id: String(s.id),
            name: s.name,
            contactPerson: s.contact_person || '',
            phone: s.phone || '',
            email: s.email || '',
            activeOrders: 0
          })));
        }

        if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value)) {
          setOrders(ordRes.value.map(o => ({
            id: String(o.id),
            orderNumber: o.order_number,
            customerName: o.customer_name || 'Guest',
            orderType: o.order_type,
            table: o.table_number,
            items: [],
            total: parseFloat(o.total),
            subtotal: parseFloat(o.subtotal),
            tax: parseFloat(o.tax_total),
            status: o.status === 'completed' ? 'Served' : o.status === 'confirmed' ? 'Preparing' : o.status === 'ready' ? 'Ready' : 'New',
            paymentStatus: o.payment_status,
            paymentMethod: o.payment_method || 'cash',
            createdAt: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }

        if (empRes.status === 'fulfilled' && Array.isArray(empRes.value)) {
          setEmployees(empRes.value.map(u => ({
            id: String(u.id),
            name: u.name,
            email: u.email || '',
            employeeId: u.employee_id || '',
            avatar: u.avatar || '',
            role: u.role === 'admin' ? 'Administrator' : u.role === 'manager' ? 'Manager' : u.role === 'cashier' ? 'Cashier' : u.role === 'barista' ? 'Barista' : 'Inventory Staff',
            status: u.is_active ? 'Active' : 'Inactive'
          })));
        }

        if (meRes.status === 'fulfilled' && meRes.value && meRes.value.id) {
          const me = meRes.value;
          const dbUser = {
            id: String(me.id),
            name: me.name,
            email: me.email || '',
            employeeId: me.employee_id || '',
            avatar: me.avatar || '',
            role: me.role === 'admin' ? 'Administrator' : me.role === 'manager' ? 'Manager' : me.role === 'cashier' ? 'Cashier' : me.role === 'barista' ? 'Barista' : 'Inventory Staff'
          };
          setCurrentUser(dbUser);
          try {
            localStorage.setItem('currentUser', JSON.stringify(dbUser));
          } catch (_) {}
        }

        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          setSettings(settingsRes.value);
        }

        if (poRes.status === 'fulfilled' && Array.isArray(poRes.value)) {
          setPurchaseOrders(poRes.value.map(po => ({
            id: po.id,
            supplier: po.supplier,
            supplierEmail: po.supplierEmail || '',
            date: po.date || '',
            expectedDelivery: po.expectedDelivery || '',
            totalCost: parseFloat(po.totalCost) || 0,
            status: po.status || 'Pending Approval',
            itemsList: po.itemsList || [],
          })));
        }

      } catch (err) {
        console.error('Failed to load data from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      loadBackendData();
    }
  }, [isLoggedIn]);

  // ─── Page Exit / Enter Transition State ───
  const [displayedTab, setDisplayedTab] = useState('dashboard');
  const [displayedSubTab, setDisplayedSubTab] = useState('');
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'exiting' | 'entering'
  const [navType, setNavType] = useState('main'); // 'main' | 'sub'
  const [showProgress, setShowProgress] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const animTimerRef = useRef(null);
  const isInitialMount = useRef(true);
  const prevTabRef = useRef(activeTab);

  // React to navigation changes: exit → switch content → enter
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayedTab(activeTab);
      setDisplayedSubTab(activeSubTab);
      prevTabRef.current = activeTab;
      return;
    }

    if (animTimerRef.current) return;

    // Determine if this is a main tab change or a sub-page change
    const isMainNav = activeTab !== prevTabRef.current;
    prevTabRef.current = activeTab;
    setNavType(isMainNav ? 'main' : 'sub');

    setShowProgress(true);
    setProgressKey(k => k + 1);

    setDisplayedTab(activeTab);
    setDisplayedSubTab(activeSubTab);
    setAnimState('entering');

    const enterDuration = isMainNav ? 400 : 500;

    animTimerRef.current = setTimeout(() => {
      setAnimState('idle');
      setShowProgress(false);
      animTimerRef.current = null;
    }, enterDuration);

    return () => {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
        setAnimState('idle');
        setShowProgress(false);
      }
    };
  }, [activeTab, activeSubTab]);

  // Stock deduction engine when order completes
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const dbStatus = newStatus === 'Served' ? 'completed' : newStatus.toLowerCase();
      await api.updateOrderStatus(orderId, dbStatus);
    } catch (err) {
      console.warn('Could not update status on backend API:', err);
    }

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        if (newStatus === 'Served' && o.status !== 'Served') {
          deductRecipeIngredientsForOrder(o);
        }
        return { ...o, status: newStatus };
      }
      return o;
    }));
  };

  const deductRecipeIngredientsForOrder = (order) => {
    order.items?.forEach(orderItem => {
      const match = products.find(p => orderItem.name?.includes(p.name));
      if (match && match.recipe) {
        match.recipe.forEach(recipeIng => {
          setIngredients(prevIngs => prevIngs.map(ing => {
            if (ing.id === recipeIng.ingredientId) {
              const newStock = Math.max(0, ing.stock - recipeIng.amount);
              let newStatus = ing.status;
              if (newStock === 0) newStatus = 'Out of Stock';
              else if (newStock <= ing.minStock) newStatus = 'Low Stock';
              return { ...ing, stock: newStock, status: newStatus };
            }
            return ing;
          }));
        });
      }
    });
  };

  const handleAddStockMovement = async (newMov) => {
    try {
      const numericVal = parseFloat(newMov.quantity.replace(/[^0-9.]/g, ''));
      const isDeduction = newMov.quantity.startsWith('-');

      // Map UI display labels to DB enum values
      const typeMap = {
        'Stock In': 'stock_in',
        'Stock Out': 'stock_out',
        'Spoilage': 'waste',
        'Waste': 'waste',
        'Manual Adjustment': 'adjustment',
        'Adjustment': 'adjustment',
      };
      const dbType = typeMap[newMov.type] || (isDeduction ? 'stock_out' : 'stock_in');

      await api.recordStockMovement({
        ingredient_id: newMov.ingredientId || null,
        customization_template_id: newMov.customizationTemplateId || null,
        type: dbType,
        quantity: numericVal,
        note: newMov.reason
      });
    } catch (err) {
      console.warn('Could not save stock movement on backend API:', err);
    }

    const movObj = {
      id: `mov-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      ...newMov
    };
    setMovements([movObj, ...movements]);

    if (newMov.customizationTemplateId) {
      const numericVal = parseFloat(newMov.quantity.replace(/[^0-9.]/g, ''));
      const isDeduction = newMov.quantity.startsWith('-');
      const targetId = String(newMov.customizationTemplateId);

      const updateStockProp = (items) => items.map(item => {
        if (item.id === targetId) {
          const current = item.stock ?? 0;
          const updated = isDeduction ? Math.max(0, current - numericVal) : current + numericVal;
          return { ...item, stock: Math.round(updated) };
        }
        return item;
      });

      setCustomizationTemplates(prev => ({
        sizes: updateStockProp(prev.sizes || []),
        options: updateStockProp(prev.options || [])
      }));
      setTemperatures(prev => updateStockProp(prev));
      setMilks(prev => updateStockProp(prev));
      setAddons(prev => updateStockProp(prev));
    } else if (newMov.ingredientId) {
      setIngredients(prev => prev.map(ing => {
        if (ing.id === newMov.ingredientId) {
          const numericVal = parseFloat(newMov.quantity.replace(/[^0-9.]/g, ''));
          const isDeduction = newMov.quantity.startsWith('-');
          const updatedStock = isDeduction ? Math.max(0, ing.stock - numericVal) : ing.stock + numericVal;

          let newStatus = 'In Stock';
          if (updatedStock === 0) newStatus = 'Out of Stock';
          else if (updatedStock <= ing.minStock) newStatus = 'Low Stock';

          return { ...ing, stock: updatedStock, status: newStatus };
        }
        return ing;
      }));
    }
  };

  const handleCreatePurchaseOrder = async (newPo) => {
    try {
      const saved = await api.createPurchaseOrder(newPo);
      setPurchaseOrders(prev => [{
        id: saved.id,
        supplier: saved.supplier,
        supplierEmail: saved.supplierEmail || '',
        date: saved.date || '',
        expectedDelivery: saved.expectedDelivery || '',
        totalCost: parseFloat(saved.totalCost) || 0,
        status: saved.status || 'Pending Approval',
        itemsList: saved.itemsList || [],
      }, ...prev]);
    } catch (err) {
      console.warn('Failed to persist purchase order:', err);
      setPurchaseOrders(prev => [newPo, ...prev]);
    }
  };

  const handleUpdatePurchaseOrder = async (poCode, updated) => {
    try {
      const saved = await api.updatePurchaseOrder(poCode, updated);
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id !== poCode) return po;
        return {
          id: saved.id,
          supplier: saved.supplier,
          supplierEmail: saved.supplierEmail || '',
          date: saved.date || '',
          expectedDelivery: saved.expectedDelivery || '',
          totalCost: parseFloat(saved.totalCost) || 0,
          status: saved.status || 'Pending Approval',
          itemsList: saved.itemsList || [],
        };
      }));
      return saved;
    } catch (err) {
      console.warn('Failed to update purchase order:', err);
      setPurchaseOrders(prev => prev.map(po => po.id === poCode ? { ...po, ...updated, id: poCode } : po));
      return { ...updated, id: poCode };
    }
  };

  const handleDeletePurchaseOrder = async (poCode) => {
    try {
      await api.deletePurchaseOrder(poCode);
      setPurchaseOrders(prev => prev.filter(po => po.id !== poCode));
      return { success: true };
    } catch (err) {
      console.warn('Failed to delete purchase order:', err);
      setPurchaseOrders(prev => prev.filter(po => po.id !== poCode));
      return { success: true };
    }
  };

  const handleAddProduct = (newProd) => {
    setProducts([newProd, ...products]);
  };

  const handleProfileUpdate = (updatedUser) => {
    const merged = { ...currentUser, ...updatedUser };
    setCurrentUser(merged);
    try {
      localStorage.setItem('currentUser', JSON.stringify(merged));
    } catch (_) {}
  };

  const splitCustomizationTemplates = (templates) => {
    const sizes = [];
    const options = [];
    for (const t of templates) {
      const item = {
        id: String(t.id),
        type: t.customization_type,
        name: t.name,
        priceDelta: parseFloat(t.default_price_delta),
        stock: t.stock !== undefined ? parseInt(t.stock, 10) : 0,
      };
      (t.customization_type === 'size' ? sizes : options).push(item);
    }
    return { sizes, options };
  };

  const handleRefreshCustomizationTemplates = async () => {
    try {
      const data = await api.getCustomizationTemplates();
      setCustomizationTemplates(splitCustomizationTemplates(data));
    } catch (err) {
      console.warn('Failed to refresh customization templates:', err);
    }
  };

  const handleRefreshRecipeTemplates = async () => {
    try {
      const data = await api.getRecipeTemplates();
      setRecipeTemplates((data || []).map(t => ({
        id: String(t.id),
        name: t.name,
        items: (t.items || []).map(item => ({
          ingredientId: String(item.ingredient_id),
          name: item.ingredient_name,
          unit: item.unit,
          amount: parseFloat(item.qty_required),
        })),
      })));
    } catch (err) {
      console.warn('Failed to refresh recipe templates:', err);
    }
  };

  const handleRefreshTemperatures = async () => {
    try {
      const data = await api.getTemperatureOptions();
      setTemperatures((data || []).map(t => ({ id: String(t.id), name: t.name, priceDelta: parseFloat(t.price_delta), stock: t.stock !== undefined ? parseInt(t.stock, 10) : 0 })));
    } catch (err) {
      console.warn('Failed to refresh temperature options:', err);
    }
  };

  const handleRefreshMilks = async () => {
    try {
      const data = await api.getMilkOptions();
      setMilks((data || []).map(m => ({ id: String(m.id), name: m.name, priceDelta: parseFloat(m.price_delta), stock: m.stock !== undefined ? parseInt(m.stock, 10) : 0 })));
    } catch (err) {
      console.warn('Failed to refresh milk options:', err);
    }
  };

  const handleRefreshAddons = async () => {
    try {
      const data = await api.getAddons();
      setAddons((data || []).map(a => ({ id: String(a.id), name: a.name, price: parseFloat(a.price), stock: a.stock !== undefined ? parseInt(a.stock, 10) : 0 })));
    } catch (err) {
      console.warn('Failed to refresh add-ons:', err);
    }
  };

  const handleNavigate = (tab, subTab) => {
    setActiveTab(tab);
    setActiveSubTab(subTab || '');
  };

  // Renders the correct page component based on tab/sub tab
  const renderPageContent = (tab, sub) => {
    // Role-based page gate — the security boundary is the server's
    // authorizeRoles, this just prevents rendering pages a role can't open.
    if (!canAccessPage(currentUser?.role, tab, sub)) {
      return (
        <div className="glass-card p-10 rounded-3xl border border-white/60 text-center animate-fadeIn">
          <span className="text-4xl block mb-3">🔒</span>
          <h2 className="font-heading font-extrabold text-xl text-[#3C2A21] mb-1">Access Restricted</h2>
          <p className="text-xs text-amber-900/60 font-medium mb-5">
            Your role does not have permission to view this page. Contact an administrator if you believe this is a mistake.
          </p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }

    const can = (resource, action = 'add') => roleCan(currentUser?.role, resource, action);
    const currentReportPage = REPORTS_PAGES.find(p => p.id === sub);

    /* Inventory valuation is a point-in-time snapshot — it ignores
       filterPeriod entirely, so the switcher is hidden for that report
       rather than left on screen as a no-op control. */
    const sharedReportContent = (pageContent, { showPeriod = true } = {}) => (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
              Business Intelligence & Audit
            </span>
            <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Reports & Analytics</h2>
            <p className="text-xs text-amber-900/60 font-medium mt-0.5">
              Financial metrics, shift reconciliation, inventory valuation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('PDF')}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">
              PDF
            </button>
            <button onClick={() => handleExport('Excel')}
              className="px-3 py-2 rounded-xl bg-[#F5E6D3] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/12 border border-amber-900/10">
              Excel
            </button>
            <button onClick={() => handleExport('CSV')}
              className="px-3 py-2 rounded-xl bg-[#FFFDF9] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/5 border border-amber-900/15">
              CSV
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-amber-900/50 font-semibold">
            <span>Reports</span>
            <span>›</span>
            <span className="text-[#3C2A21] font-bold">{currentReportPage?.label}</span>
          </div>
          {showPeriod && (
            <div className="flex items-center gap-1 glass-card rounded-xl border border-white/60 p-1">
              {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterPeriod === p ? 'bg-[#3C2A21] text-amber-100 shadow-sm' : 'text-amber-900/55 hover:text-[#3C2A21]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        {pageContent}
      </div>
    );

    switch (tab) {
      case 'dashboard':
        return (
          <Dashboard
            ingredients={ingredients}
            products={products}
            orders={orders}
            onNavigate={handleNavigate}
            onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
          />
        );
      case 'transactions':
        return <TransactionsPage currency={settings.currency || 'PHP'} />;
      case 'profile':
        return <ProfilePage currentUser={currentUser} onProfileUpdate={handleProfileUpdate} />;
      case 'live_view':
        return <LiveViewPage orders={orders} />;
      case 'shift_log':
        return <ShiftLogPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'activity_history':
        return <ActivityHistoryPage />;
      case 'menu':
        switch (sub) {
          case 'categories':
            return (
              <CategoriesPage
                categories={categories}
                can={can}
                onAddCategory={(newCat) => setCategories(prev => [...prev, newCat])}
                onUpdateCategory={(updatedCat) => setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c))}
                onDeleteCategory={(catId) => setCategories(prev => prev.filter(c => c.id !== catId))}
              />
            );
          case 'customizations':
            return <CustomizationsPage products={products} ingredients={ingredients} customizationTemplates={customizationTemplates} temperatures={temperatures} milks={milks} addons={addons} can={can} onUpdateProduct={handleUpdateProduct} onRefreshCustomizationTemplates={handleRefreshCustomizationTemplates} onRefreshTemperatures={handleRefreshTemperatures} onRefreshMilks={handleRefreshMilks} onRefreshAddons={handleRefreshAddons} onAddStockMovement={handleAddStockMovement} />;
          case 'recipes':
            return <RecipesPage products={products} ingredients={ingredients} can={can} onUpdateProduct={handleUpdateProduct} />;
          default:
            return (
              <ProductsPage
                products={products}
                categories={categories}
                ingredients={ingredients}
                customizationTemplates={customizationTemplates}
                temperatures={temperatures}
                milks={milks}
                addons={addons}
                can={can}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
              />
            );
        }
      case 'inventory':
        switch (sub) {
          case 'ingredients':
            return <IngredientsPage ingredients={ingredients} can={can} onAddStockMovement={handleAddStockMovement} onAddIngredient={handleAddIngredient} onDeleteIngredient={handleDeleteIngredient} />;
          case 'stock_movements':
            return <StockMovementsPage movements={movements} can={can} />;
          case 'purchase_orders':
            return <PurchaseOrdersPage purchaseOrders={purchaseOrders} suppliers={suppliers} ingredients={ingredients} can={can} onCreatePurchaseOrder={handleCreatePurchaseOrder} onUpdatePurchaseOrder={handleUpdatePurchaseOrder} onDeletePurchaseOrder={handleDeletePurchaseOrder} onRefreshPurchaseOrders={refreshPurchaseOrders} />;
          case 'suppliers':
            return <SuppliersPage suppliers={suppliers} can={can} onCreatePurchaseOrder={handleCreatePurchaseOrder} onAddSupplier={(newSup) => setSuppliers(prev => [...prev, newSup])} />;
          default:
            return (
              <InventoryManagement
                ingredients={ingredients}
                movements={movements}
                purchaseOrders={purchaseOrders}
                suppliers={suppliers}
                onNavigate={(tab, subTab) => { setActiveTab(tab); setActiveSubTab(subTab || ''); }}
              />
            );
        }
      case 'reports':
        switch (sub) {
          case 'sales':
            return sharedReportContent(<SalesReportPage filterPeriod={filterPeriod} onSetFilterPeriod={setFilterPeriod} handleExport={handleExport} />);
          case 'best_sellers':
            return sharedReportContent(<BestSellersPage />);
          case 'inventory':
            return sharedReportContent(<InventoryValuationPage ingredients={ingredients} />, { showPeriod: false });
          case 'shift_reports':
            return sharedReportContent(<ShiftReconciliationPage />);
          default:
            return sharedReportContent(<SalesReportPage filterPeriod={filterPeriod} onSetFilterPeriod={setFilterPeriod} handleExport={handleExport} />);
        }
      case 'users':
        return (
          <UserManagement
            employees={employees}
            can={can}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onToggleEmployeeStatus={handleToggleEmployeeStatus}
          />
        );
      case 'settings':
        return (
          <SystemSettings
            settings={settings}
            onUpdateSettings={setSettings}
            activeSubTab={sub}
            onSetSubTab={setActiveSubTab}
            can={can}
            ingredients={ingredients}
            recipeTemplates={recipeTemplates}
            onRefreshRecipeTemplates={handleRefreshRecipeTemplates}
            suppliers={suppliers}
          />
        );
      case 'kitchen':
        return (
          <KitchenDisplay
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            ingredients={ingredients}
            products={products}
          />
        );
      default:
        return null;
    }
  };

  const handleUpdateProduct = (updatedProd) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await api.deleteProduct(productId);
    } catch (err) {
      console.warn('API error deleting product:', err);
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleAddEmployee = (newEmp) => {
    setEmployees([...employees, newEmp]);
  };

  const handleUpdateEmployee = (updatedEmp) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? { ...e, ...updatedEmp } : e));
  };

  const handleDeleteEmployee = async (empId) => {
    try {
      await api.deleteUser(empId);
    } catch (err) {
      console.warn('API error deleting user:', err);
    }
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  const handleAddIngredient = (newIng) => {
    setIngredients([...ingredients, newIng]);
  };

  const handleDeleteIngredient = (ingId) => {
    setIngredients(prev => prev.filter(i => i.id !== ingId));
  };

  const handleToggleEmployeeStatus = (empId) => {
    setEmployees(prev => prev.map(e => {
      if (e.id === empId) {
        return { ...e, status: e.status === 'Active' ? 'Disabled' : 'Active' };
      }
      return e;
    }));
  };

  const handleSwitchRole = (newRole) => {
    setCurrentUser(prev => ({ ...prev, role: newRole }));
  };

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    if (isLoggedIn) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('coffee_token');
    }
  }, [isLoggedIn, currentUser]);

  const lowStockCount = ingredients.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;

  const REPORTS_PAGES = [
    { id: 'sales',         label: 'Sales Report' },
    { id: 'best_sellers',  label: 'Best Sellers' },
    { id: 'inventory',     label: 'Inventory Valuation' },
    { id: 'shift_reports', label: 'Shift Reconciliation' },
  ];
  const handleExport = (format) => {
    const reportPage = REPORTS_PAGES.find(p => p.id === displayedSubTab);
    alert(`Exporting ${reportPage?.label || 'Report'} as ${format}...`);
  };

  const authNoticeModal = authNotice && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-card bg-[#FFFDF9] rounded-3xl border border-white/60 p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-900/10 text-[#693F27] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-heading font-extrabold text-xl text-[#3C2A21] mb-2">Session Expired</h3>
        <p className="text-sm text-amber-900/70 font-medium mb-6">{authNotice}</p>
        <button
          onClick={() => setAuthNotice(null)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-sm font-bold shadow-md hover:brightness-110 transition-all"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  // If not logged in → full-page login
  if (!isLoggedIn) {
    return (
      <>
        <LoginPage
          onLogin={(userData) => {
            setCurrentUser(userData);
            setIsLoggedIn(true);
          }}
        />
        <SupplierScanAlert
          message={scanAlert}
          contradiction={scanAlertContradiction}
          onClose={() => setScanAlert(null)}
          onStockUp={handleStockUp}
          onReverseStock={handleReverseStock}
          onViewPurchaseOrders={() => {
            setActiveTab('inventory');
            setActiveSubTab('purchase_orders');
          }}
        />
        {authNoticeModal}
      </>
    );
  }

  // Loading screen while fetching data from backend
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F5E6D3] via-[#FFFDF9] to-[#EAD9C4]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#C08552]/30 border-t-[#693F27] animate-spin" />
          <p className="text-[#693F27] font-bold text-lg tracking-wide">Loading your workspace…</p>
          <p className="text-[#3C2A21]/50 text-sm">Fetching data from the server</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#F5E6D3] via-[#FFFDF9] to-[#EAD9C4] text-[#3C2A21] relative overflow-x-hidden font-sans">
      {/* Dynamic Ambient Glass Glow Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#C08552]/10 rounded-full blur-[140px] animate-ambient" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-[#3C2A21]/10 rounded-full blur-[140px] animate-ambient-delay" />
      </div>

      {/* Main Glass Shell Container */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setActiveSubTab('');
            setIsMobileOpen(false);
          }}
          activeSubTab={activeSubTab}
          onSelectSubItem={(parentTab, subId) => {
            setActiveTab(parentTab);
            const subMap = {
              'Ingredients': 'ingredients',
              'Stock Movements': 'stock_movements',
              'Purchase Orders': 'purchase_orders',
              'Suppliers': 'suppliers',
              'Sales': 'sales',
              'Best Sellers': 'best_sellers',
              'Inventory': 'inventory',
              'Shift Reports': 'shift_reports',
              'Categories': 'categories',
              'Products': 'products',
              'Customizations': 'customizations',
              'Recipes': 'recipes',
              'Tax & VAT': 'tax_vat',
              'Receipt Layout': 'receipt_layout',
              'Store Branding': 'branding',
              'Hardware Printers': 'hardware_printers',
              'Payment Gateways': 'payment_gateways',
              'Communications': 'communications',
              'Communications Setup': 'communications',
              'Email Setup': 'communications',
              'Database Backup': 'database_backup',
              'Branches': 'branches',
            };
            setActiveSubTab(subMap[subId] || subId.toLowerCase().replace(/ /g, '_'));
            setIsMobileOpen(false);
          }}
          currentUser={currentUser}
          onLogout={() => {
            setIsLoggedIn(false);
            setActiveTab('dashboard');
            setActiveSubTab('');
          }}
          lowStockCount={lowStockCount}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          {/* Page Transition Progress Bar */}
          {showProgress && (
            <div className="fixed top-0 left-0 lg:left-64 right-0 z-50 h-0.5 overflow-hidden">
              <div
                key={progressKey}
                className="h-full w-0 rounded-full bg-gradient-to-r from-[#C08552] via-[#8B5E3C] to-[#693F27] animate-progress-bar shadow-[0_0_6px_rgba(192,133,82,0.5)]"
                style={{ animationDuration: `${navType === 'sub' ? 500 : 400}ms` }}
              />
            </div>
          )}
          <Header
            currentUser={currentUser}
            onSwitchRole={handleSwitchRole}
            activeTab={activeTab}
            onOpenNewProductModal={() => setIsNewProductModalOpen(true)}
            onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
            onNavigate={handleNavigate}
          />

          {/* View Container */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl w-full mx-auto pt-24">
            <div key={`page-${displayedTab}-${displayedSubTab}`} className={animState === 'entering' ? (navType === 'sub' ? 'animate-slideInRight' : 'animate-fadeIn') : ''}>
              {renderPageContent(displayedTab, displayedSubTab)}
            </div>
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <CreateProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onSaveProduct={handleAddProduct}
        categories={categories}
        ingredients={ingredients}
        customizationTemplates={customizationTemplates}
        temperatures={temperatures}
        milks={milks}
        addons={addons}
        recipeTemplates={recipeTemplates}
      />

      {/* Global supplier-scan alert popup (all pages) */}
      <SupplierScanAlert
        message={scanAlert}
        contradiction={scanAlertContradiction}
        onClose={() => setScanAlert(null)}
        onStockUp={handleStockUp}
        onReverseStock={handleReverseStock}
        onViewPurchaseOrders={() => {
          setActiveTab('inventory');
          setActiveSubTab('purchase_orders');
        }}
      />

      {authNoticeModal}
    </div>
  );
}

export default App;
