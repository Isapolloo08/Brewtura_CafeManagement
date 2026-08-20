// Seed mock database for Coffee Shop Admin/Manager Application

export const INITIAL_INGREDIENTS = [
  { id: 'ing-1', name: 'House Blend Coffee Beans', category: 'Coffee', stock: 42.5, unit: 'kg', minStock: 10, maxStock: 100, costPerUnit: 18.5, status: 'In Stock' },
  { id: 'ing-2', name: 'Fresh Whole Milk', category: 'Dairy', stock: 8.0, unit: 'L', minStock: 15, maxStock: 60, costPerUnit: 2.2, status: 'Low Stock' },
  { id: 'ing-3', name: 'Oat Milk (Barista Edition)', category: 'Dairy Alternatives', stock: 2.0, unit: 'L', minStock: 10, maxStock: 40, costPerUnit: 3.8, status: 'Low Stock' },
  { id: 'ing-4', name: 'Chocolate Syrup', category: 'Syrups', stock: 12.0, unit: 'Bottles', minStock: 5, maxStock: 25, costPerUnit: 8.5, status: 'In Stock' },
  { id: 'ing-5', name: 'Vanilla Syrup', category: 'Syrups', stock: 15.0, unit: 'Bottles', minStock: 5, maxStock: 25, costPerUnit: 8.5, status: 'In Stock' },
  { id: 'ing-6', name: 'Refined Organic Sugar', category: 'Sweeteners', stock: 28.0, unit: 'kg', minStock: 10, maxStock: 50, costPerUnit: 1.5, status: 'In Stock' },
  { id: 'ing-7', name: 'Purified Ice Cubes', category: 'Consumables', stock: 85.0, unit: 'kg', minStock: 30, maxStock: 200, costPerUnit: 0.2, status: 'In Stock' },
  { id: 'ing-8', name: '12oz Paper Cups (Hot)', category: 'Packaging', stock: 450, unit: 'pcs', minStock: 200, maxStock: 2000, costPerUnit: 0.12, status: 'In Stock' },
  { id: 'ing-9', name: '16oz Clear Iced Cups', category: 'Packaging', stock: 120, unit: 'pcs', minStock: 300, maxStock: 2000, costPerUnit: 0.15, status: 'Low Stock' },
  { id: 'ing-10', name: 'Standard Sipper Lids', category: 'Packaging', stock: 1200, unit: 'pcs', minStock: 300, maxStock: 2500, costPerUnit: 0.05, status: 'In Stock' },
  { id: 'ing-11', name: 'Eco Paper Straws', category: 'Packaging', stock: 0, unit: 'pcs', minStock: 200, maxStock: 1500, costPerUnit: 0.03, status: 'Out of Stock' },
  { id: 'ing-12', name: 'Fresh Croissants (Dough)', category: 'Bakery', stock: 4, unit: 'units', minStock: 15, maxStock: 50, costPerUnit: 1.1, status: 'Low Stock', expiringSoon: true },
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Iced Brewtura Latte',
    category: 'Coffee',
    price: 4.75,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80',
    description: 'Signature espresso layered with fresh chilled milk over crystal ice.',
    customizations: [
      { name: 'Small (12oz)', priceDelta: 0 },
      { name: 'Medium (16oz)', priceDelta: 0.60 },
      { name: 'Large (20oz)', priceDelta: 1.20 }
    ],
    customizationGroups: {
      sugar: ['0%', '25%', '50%', '75%', '100%'],
      ice: ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice'],
      milk: ['Whole Milk', 'Oat Milk (+ $0.75)', 'Almond Milk (+ $0.75)'],
      extras: ['Extra Espresso Shot (+ $1.00)', 'Vanilla Syrup (+ $0.50)', 'Whipped Cream (+ $0.60)']
    },
    recipe: [
      { ingredientId: 'ing-1', name: 'House Blend Coffee Beans', amount: 0.02, unit: 'kg' },
      { ingredientId: 'ing-2', name: 'Fresh Whole Milk', amount: 0.20, unit: 'L' },
      { ingredientId: 'ing-7', name: 'Purified Ice Cubes', amount: 0.15, unit: 'kg' },
      { ingredientId: 'ing-9', name: '16oz Clear Iced Cups', amount: 1, unit: 'pcs' },
      { ingredientId: 'ing-10', name: 'Standard Sipper Lids', amount: 1, unit: 'pcs' }
    ]
  },
  {
    id: 'prod-2',
    name: 'Single Origin Espresso',
    category: 'Coffee',
    price: 3.25,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=400&q=80',
    description: 'Rich, full-bodied double shot with golden hazelnut crema.',
    customizations: [
      { name: 'Single Shot', priceDelta: 0 },
      { name: 'Double Shot', priceDelta: 0.75 }
    ],
    customizationGroups: {
      sugar: ['None', 'Side Sugar Packet'],
      ice: ['N/A'],
      milk: ['None'],
      extras: ['Extra Shot (+ $1.00)']
    },
    recipe: [
      { ingredientId: 'ing-1', name: 'House Blend Coffee Beans', amount: 0.018, unit: 'kg' }
    ]
  },
  {
    id: 'prod-3',
    name: 'Ceremonial Matcha Latte',
    category: 'Non-Coffee',
    price: 5.25,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80',
    description: 'First-harvest Uji matcha whisked with steamed whole milk.',
    customizations: [
      { name: 'Hot (12oz)', priceDelta: 0 },
      { name: 'Iced (16oz)', priceDelta: 0.50 }
    ],
    recipe: [
      { ingredientId: 'ing-2', name: 'Fresh Whole Milk', amount: 0.22, unit: 'L' },
      { ingredientId: 'ing-6', name: 'Refined Organic Sugar', amount: 0.01, unit: 'kg' }
    ]
  },
  {
    id: 'prod-4',
    name: 'Butter Croissant',
    category: 'Pastries',
    price: 4.15,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
    description: 'Flaky 81-layer French butter croissant baked daily at dawn.',
    customizations: [{ name: 'Standard', priceDelta: 0 }],
    recipe: [
      { ingredientId: 'ing-12', name: 'Fresh Croissants (Dough)', amount: 1, unit: 'units' }
    ]
  },
  {
    id: 'prod-5',
    name: 'Earl Lavender Milk Tea',
    category: 'Tea',
    price: 4.95,
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    description: 'Bergamot-infused Earl Grey infused with French lavender petals.',
    customizations: [{ name: '16oz Standard', priceDelta: 0 }],
    recipe: [
      { ingredientId: 'ing-2', name: 'Fresh Whole Milk', amount: 0.18, unit: 'L' },
      { ingredientId: 'ing-5', name: 'Vanilla Syrup', amount: 0.05, unit: 'Bottles' }
    ]
  }
];

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Coffee', count: 12, icon: 'Coffee' },
  { id: 'cat-2', name: 'Non-Coffee', count: 6, icon: 'CupSoda' },
  { id: 'cat-3', name: 'Tea', count: 8, icon: 'Leaf' },
  { id: 'cat-4', name: 'Pastries', count: 10, icon: 'Croissant' },
  { id: 'cat-5', name: 'Desserts', count: 5, icon: 'Cake' },
  { id: 'cat-6', name: 'Snacks', count: 4, icon: 'Cookie' },
];

export const INITIAL_STOCK_MOVEMENTS = [
  { id: 'mov-1', timestamp: '2026-07-29 08:30 AM', ingredientName: 'House Blend Coffee Beans', type: 'Stock In', quantity: '+20.0 kg', reason: 'Delivery from Highland Roasters', user: 'Sarah Miller (Inventory)' },
  { id: 'mov-2', timestamp: '2026-07-29 11:15 AM', ingredientName: 'Fresh Whole Milk', type: 'Spoilage', quantity: '-2.0 L', reason: 'Exceeded cold storage temperature limit', user: 'Marco V. (Manager)' },
  { id: 'mov-3', timestamp: '2026-07-29 02:00 PM', ingredientName: '16oz Clear Iced Cups', type: 'Manual Adjustment', quantity: '-10 pcs', reason: 'Damaged packaging during inventory recount', user: 'Marco V. (Manager)' },
  { id: 'mov-4', timestamp: '2026-07-29 04:45 PM', ingredientName: 'Oat Milk (Barista Edition)', type: 'Stock Out', quantity: '-6.0 L', reason: 'Transferred to Front POS Bar Station 1', user: 'Julian Chen (Barista)' },
];

export const INITIAL_PURCHASE_ORDERS = [
  { id: 'PO-8821', supplier: 'Highland Coffee Beans Co.', date: '2026-07-28', items: 3, totalCost: 450.00, status: 'Completed', expectedDelivery: '2026-07-29' },
  { id: 'PO-8822', supplier: 'Green Valley Dairy Farms', date: '2026-07-29', items: 2, totalCost: 184.00, status: 'In Transit', expectedDelivery: '2026-07-30' },
  { id: 'PO-8823', supplier: 'EcoPack Solutions Ltd.', date: '2026-07-29', items: 4, totalCost: 310.50, status: 'Pending Approval', expectedDelivery: '2026-08-01' },
];

export const INITIAL_SUPPLIERS = [
  { id: 'sup-1', name: 'Highland Coffee Beans Co.', contactPerson: 'David Vance', phone: '+1 (555) 234-8890', email: 'orders@highlandbeans.com', address: '45 Roasters Way, Seattle WA', activeOrders: 1 },
  { id: 'sup-2', name: 'Green Valley Dairy Farms', contactPerson: 'Clara Bennett', phone: '+1 (555) 876-1122', email: 'supply@greenvalleydairy.com', address: '12 Milk Barn Rd, Tillamook OR', activeOrders: 1 },
  { id: 'sup-3', name: 'EcoPack Solutions Ltd.', contactPerson: 'Jason Wright', phone: '+1 (555) 443-9900', email: 'jason@ecopack.io', address: '808 Industrial Pkwy, Portland OR', activeOrders: 1 },
];

export const INITIAL_EMPLOYEES = [];

export const INITIAL_ORDERS = [
  {
    id: '#105',
    type: 'Take-Out',
    status: 'New',
    timeElapsed: '04:12',
    items: [
      { name: '2x Oat Milk Latte', note: 'Less Ice, 50% Sugar' },
      { name: '1x Matcha Ceremonial', note: 'Extra Hot' }
    ],
    customer: 'Walk-in Customer',
    total: 14.75,
    timestamp: '2026-07-29 16:45:10'
  },
  {
    id: '#102',
    type: 'Dine-In (Table 4)',
    status: 'Preparing',
    timeElapsed: '08:30',
    items: [
      { name: '2x Flat White', note: 'Whole Milk' },
      { name: '1x Blueberry Muffin', note: 'Warmed' }
    ],
    customer: 'Alex Rivera',
    total: 13.65,
    timestamp: '2026-07-29 16:41:00'
  },
  {
    id: '#101',
    type: 'Pick-Up',
    status: 'Ready',
    timeElapsed: '14:15',
    items: [
      { name: '1x Cold Brew Floats', note: 'Vanilla Cream' }
    ],
    customer: 'Sarah Jenkins',
    total: 5.50,
    timestamp: '2026-07-29 16:35:00'
  },
  {
    id: '#104',
    type: 'Dine-In (Table 12)',
    status: 'Preparing',
    timeElapsed: '02:05',
    items: [
      { name: '1x Espresso Tonic', note: 'Double Shot' },
      { name: '1x Avocado Toast', note: 'Extra Chili Flakes' }
    ],
    customer: 'David Kim',
    total: 12.80,
    timestamp: '2026-07-29 16:47:00'
  }
];

export const INITIAL_SHIFTS = [
  { id: 'shf-01', cashier: 'Julian Chen', shiftDate: '2026-07-29', openTime: '06:00 AM', closeTime: '02:00 PM', openingCash: 150.00, closingCash: 612.20, cashSales: 462.20, digitalSales: 820.50, expectedCash: 612.20, actualCash: 612.20, difference: 0.00, status: 'Matched' },
  { id: 'shf-02', cashier: 'Sarah K.', shiftDate: '2026-07-29', openTime: '02:00 PM', closeTime: '10:00 PM', openingCash: 150.00, closingCash: 501.00, cashSales: 355.00, digitalSales: 1105.00, expectedCash: 505.00, actualCash: 501.00, difference: -4.00, status: 'Reconciling' },
];

export const INITIAL_SETTINGS = {
  storeName: 'Brewtura - Downtown',
  taxId: 'PH-882-001-023',
  address: '120 Brew Street, Industrial District, Metro Manila, Philippines',
  contactNumber: '+63 (02) 8877-9911',
  vatRate: 12,
  serviceCharge: 5,
  taxInclusive: true,
  receiptHeader: 'Welcome to Brewtura!',
  receiptFooter: 'Thank you for supporting sustainable coffee! Follow us @Brewtura',
  qrCodeEnabled: true,
  kitchenPrinter: '80mm Thermal (Ethernet IP: 192.168.1.102)',
  receiptPrinter: '80mm Thermal (USB POS-001)',
  payments: {
    cash: true,
    gcash: true,
    maya: true,
    creditCard: true
  }
};
