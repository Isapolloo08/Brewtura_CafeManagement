import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { EditProductModal } from './EditProductModal';
import { ConfirmModal } from './ConfirmModal';
import api from '../services/api.js';

export function ProductsPage({ products, categories, ingredients, can, onUpdateProduct, onDeleteProduct, onOpenNewProductModal, customizationTemplates, temperatures, milks, addons }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(products[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName);
    setCurrentPage(1);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleToggleStatus = (product) => {
    const updated = {
      ...product,
      status: product.status === 'Available' ? 'Unavailable' : 'Available'
    };
    onUpdateProduct(updated);
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(updated);
    }
  };

  const handleDelete = async (productId) => {
    try {
      await api.deleteProduct(productId);
    } catch (err) {
      console.warn('API error deleting product:', err);
    }
    onDeleteProduct(productId);
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }
  };

  // ─── Can Make (yield) calculation ───
  const calcYield = (rows, stockMap) => {
    if (!rows || rows.length === 0) return null;
    let units = Infinity;
    let limitedBy = null;
    rows.forEach((r) => {
      const ing = stockMap[r.ingredientId];
      const qty = r.amount;
      if (!ing || !(qty > 0)) return;
      const u = Math.floor(ing.stock / qty);
      if (u < units) {
        units = u;
        limitedBy = { name: r.name, unit: r.unit, remaining: ing.stock };
      }
    });
    if (units === Infinity) return null;
    return { units, limitedBy };
  };

  const yields = useMemo(() => {
    const stockMap = {};
    ingredients.forEach((ing) => { stockMap[ing.id] = { stock: ing.stock, unit: ing.unit }; });
    const result = {};
    products.forEach((p) => {
      const recipe = p.recipe || [];
      const baseRows = recipe.filter((r) => !r.customizationId);
      const base = calcYield(baseRows, stockMap);
      const sizes = (p.customizations || [])
        .filter((v) => !v.customization_type || v.customization_type === 'size')
        .map((size) => {
          const sizeRows = recipe.filter((r) => r.customizationId === String(size.id));
          const y = sizeRows.length > 0 ? calcYield(sizeRows, stockMap) : base;
          return { id: size.id, name: size.name, yield: y };
        });
      result[p.id] = { base, sizes };
    });
    return result;
  }, [products, ingredients]);

  const selectedRecipe = selectedProduct?.recipe || [];
  const baseRecipeRows = selectedRecipe.filter((r) => !r.customizationId);
  const sizeRecipeMap = {};
  selectedRecipe.filter((r) => r.customizationId).forEach((r) => {
    if (!sizeRecipeMap[r.customizationId]) sizeRecipeMap[r.customizationId] = [];
    sizeRecipeMap[r.customizationId].push(r);
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Menu Items
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Products
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Manage product listings, pricing, and availability.
          </p>
        </div>

        {can('menu', 'add') && (
          <button
            onClick={() => { setSelectedProduct(null); onOpenNewProductModal(); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Icons.Plus className="w-4 h-4" /> Create New Product
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => handleCategoryChange('All')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all whitespace-nowrap ${selectedCategory === 'All'
                ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                : 'glass-card text-[#3C2A21] hover:bg-amber-900/10'
              }`}
          >
            All Items ({products.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.name)}
              className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all whitespace-nowrap ${selectedCategory === cat.name
                  ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                  : 'glass-card text-[#3C2A21] hover:bg-amber-900/10'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-2xl glass-input text-[#3C2A21]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-900/10 text-amber-900/60 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Can Make</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
                {paginatedProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-900/10 font-bold' : 'hover:bg-amber-900/5'
                        }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-900/10"
                          />
                          <div>
                            <p className="text-[#3C2A21]">{product.name}</p>
                            <span className="text-[10px] text-amber-900/50 font-normal">
                              {product.temperatures?.length || product.milks?.length || product.addons?.length ? 'Customizable' : 'Standard'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-amber-900/80">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-900/5 text-amber-900 text-[11px] font-bold">
                          {product.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-[#3C2A21]">
                        ${product.price.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        {can('menu', 'edit') ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(product);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all ${product.status === 'Available'
                                ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-800 border-red-500/20 hover:bg-red-500/20'
                              }`}
                          >
                            {product.status}
                          </button>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${product.status === 'Available'
                              ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-800 border-red-500/20'
                            }`}>
                            {product.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {yields[product.id]?.base ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 text-[11px] font-extrabold">
                            ~{yields[product.id].base.units}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-900/40 font-medium">No recipe</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-sm">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-amber-900/10 text-xs text-amber-900/70 font-medium">
              <span>
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length)} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-amber-900/20 glass-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-900/10 font-bold transition-all text-[#3C2A21]"
                >
                  Previous
                </button>
                <span className="font-bold text-[#3C2A21] px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 rounded-xl border border-amber-900/20 glass-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-900/10 font-bold transition-all text-[#3C2A21]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedProduct ? (
          <div className="glass-card rounded-3xl border border-white/60 p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="relative rounded-2xl overflow-hidden h-40 mb-4 ring-1 ring-amber-900/20">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#3C2A21]/80 backdrop-blur-md text-amber-100 text-xs font-bold">
                  ${selectedProduct.price.toFixed(2)}
                </span>
              </div>

              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">
                {selectedProduct.name}
              </h3>
              <p className="text-xs text-amber-900/70 mt-1 font-medium">
                {selectedProduct.description}
              </p>

              <div className="mt-4 pt-4 border-t border-amber-900/10">
                <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Details</h4>
                <div className="space-y-1.5 text-xs text-amber-900/80">
                  <p><span className="font-bold text-[#3C2A21]">Category:</span> {selectedProduct.category}</p>
                  <p><span className="font-bold text-[#3C2A21]">Status:</span> {selectedProduct.status}</p>
                  <p><span className="font-bold text-[#3C2A21]">Recipe Items:</span> {baseRecipeRows.length} base{Object.keys(sizeRecipeMap).length > 0 ? ` + ${Object.keys(sizeRecipeMap).length} size recipe(s)` : ''}</p>
                  {(baseRecipeRows.length > 0 || Object.keys(sizeRecipeMap).length > 0) && (
                    <div className="mt-2 space-y-1">
                      {baseRecipeRows.map((r, idx) => (
                        <p key={idx} className="text-[11px] text-amber-900/70">
                          {r.name}: {r.amount} {r.unit}
                        </p>
                      ))}
                      {Object.entries(sizeRecipeMap).map(([cid, rows]) => {
                        const size = (selectedProduct.customizations || []).find(v => String(v.id) === cid);
                        return (
                          <div key={cid} className="pt-1">
                            <p className="text-[10px] font-bold text-[#693F27] uppercase tracking-wide">{size?.name || 'Custom'}</p>
                            {rows.map((r, idx) => (
                              <p key={idx} className="text-[11px] text-amber-900/70">
                                {r.name}: {r.amount} {r.unit}
                              </p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {yields[selectedProduct.id] && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Can Make (from current stock)</h4>
                  <div className="space-y-1.5">
                    {yields[selectedProduct.id].base ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-900/80">Standard</span>
                        <div className="text-right">
                          <span className="font-extrabold text-[#693F27]">~{yields[selectedProduct.id].base.units}</span>
                          {yields[selectedProduct.id].base.limitedBy && (
                            <p className="text-[10px] text-amber-900/50 font-medium">
                              Limited by: {yields[selectedProduct.id].base.limitedBy.name} ({yields[selectedProduct.id].base.limitedBy.remaining} {yields[selectedProduct.id].base.limitedBy.unit} left)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-900/50 font-medium">No base recipe set</p>
                    )}
                    {yields[selectedProduct.id].sizes.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-900/80">{s.name}</span>
                        <div className="text-right">
                          <span className="font-extrabold text-[#693F27]">{s.yield ? `~${s.yield.units}` : '—'}</span>
                          {s.yield?.limitedBy && (
                            <p className="text-[10px] text-amber-900/50 font-medium">
                              Limited by: {s.yield.limitedBy.name} ({s.yield.limitedBy.remaining} {s.yield.limitedBy.unit} left)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.customizations && selectedProduct.customizations.filter(v => !v.customization_type || v.customization_type === 'size').length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Sizes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.customizations.filter(v => !v.customization_type || v.customization_type === 'size').map((v, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#3C2A21]/5 text-[#693F27] border border-[#C08552]/30"
                      >
                        {v.name} {(v.price_delta ?? v.priceDelta ?? 0) > 0 ? `(+$${(v.price_delta ?? v.priceDelta ?? 0).toFixed(2)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.temperatures && selectedProduct.temperatures.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Temperature</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.temperatures.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#3C2A21]/5 text-[#693F27] border border-[#C08552]/30"
                      >
                        {t.name} {t.priceDelta > 0 ? `(+$${t.priceDelta.toFixed(2)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.milks && selectedProduct.milks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Milk Options</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.milks.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#3C2A21]/5 text-[#693F27] border border-[#C08552]/30"
                      >
                        {m.name} {m.priceDelta > 0 ? `(+$${m.priceDelta.toFixed(2)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Add-Ons</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.addons.map((a, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-900/5 text-amber-900 border border-amber-900/10"
                      >
                        {a.name} {a.price > 0 ? `(+$${a.price.toFixed(2)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {can('menu', 'edit') && (
                <button
                  type="button"
                  onClick={() => setEditingProduct(selectedProduct)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold hover:brightness-110 shadow-md"
                >
                  <Icons.Edit className="w-3.5 h-3.5" /> Edit Product
                </button>
              )}
              {can('menu', 'delete') && (
                <button
                  type="button"
                  onClick={() => setDeletingProduct(selectedProduct)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/10 text-red-700 text-xs font-bold hover:bg-red-600/20 border border-red-500/20 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5" /> Delete Product
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl border border-white/60 p-6 text-center text-amber-900/50 text-xs font-semibold flex items-center justify-center">
            Select a product to view details
          </div>
        )}
      </div>
      <EditProductModal
        key={editingProduct?.id || 'none'}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categories={categories}
        ingredients={ingredients}
        customizationTemplates={customizationTemplates}
        temperatures={temperatures || []}
        milks={milks || []}
        addons={addons || []}
        onUpdateProduct={(updated) => {
          onUpdateProduct(updated);
          setSelectedProduct(updated);
        }}
      />

      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => handleDelete(deletingProduct.id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
