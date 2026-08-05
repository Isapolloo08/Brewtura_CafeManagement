import React, { useState } from 'react';

export function MenuManagement({ products, categories, ingredients, onUpdateProduct, onOpenNewProductModal }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(products[0] || null);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Title & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Catalog & Recipe Builder
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Menu Management
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Configure products, pricing, customizations, and ingredient BOM recipes.
          </p>
        </div>

        <button
          onClick={onOpenNewProductModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <span>✨</span> + Create New Product
        </button>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                : 'glass-card text-[#3C2A21] hover:bg-amber-900/10'
            }`}
          >
            All Items ({products.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-2 text-xs font-bold rounded-2xl transition-all whitespace-nowrap ${
                selectedCategory === cat.name
                  ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                  : 'glass-card text-[#3C2A21] hover:bg-amber-900/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filter Search */}
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-2xl glass-input text-[#3C2A21]"
          />
        </div>
      </div>

      {/* Split View: Products Table & Recipe / Details Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Products Table */}
        <div className="lg:col-span-2 glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-900/10 text-amber-900/60 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-900/10 font-bold' : 'hover:bg-amber-900/5'
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
                              {product.customizations ? `${product.customizations.length} Customizations` : 'Standard'}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(product);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all ${
                            product.status === 'Available'
                              ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-800 border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {product.status}
                        </button>
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
        </div>

        {/* Right 1 Column: Product Inspector & Recipe BOM Details */}
        {selectedProduct ? (
          <div className="glass-card rounded-3xl border border-white/60 p-6 flex flex-col justify-between space-y-6">
            <div>
              {/* Image & Overview */}
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

              {/* Recipe / BOM Section ⭐ ⭐ ⭐ */}
              <div className="mt-6 pt-4 border-t border-amber-900/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧪</span>
                    <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">
                      Recipe Detail (BOM)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-amber-900/10 text-[#693F27] font-bold px-2 py-0.5 rounded-full">
                    Auto-Inventory Deduct
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedProduct.recipe && selectedProduct.recipe.length > 0 ? (
                    selectedProduct.recipe.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10 text-xs"
                      >
                        <span className="font-bold text-[#3C2A21]">{ing.name}</span>
                        <span className="font-extrabold text-[#C08552]">
                          {ing.amount} {ing.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-amber-900/50 font-medium bg-amber-900/5 rounded-xl">
                      No recipe attached. Tap edit to bind ingredients.
                    </div>
                  )}
                </div>
              </div>

              {/* Customizations */}
              {selectedProduct.customizations && (
                <div className="mt-4 pt-4 border-t border-amber-900/10">
                  <h4 className="font-bold text-xs text-[#3C2A21] mb-2">Available Customizations</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.customizations.map((v, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-900/5 text-amber-900 border border-amber-900/10"
                      >
                        {v.name} {v.priceDelta > 0 ? `(+$${v.priceDelta.toFixed(2)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => alert(`Recipe modifier for ${selectedProduct.name} saved!`)}
                className="w-full py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold hover:brightness-110 shadow-md"
              >
                ✏️ Edit Recipe Mapping
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl border border-white/60 p-6 text-center text-amber-900/50 text-xs font-semibold flex items-center justify-center">
            Select a product to view recipes and properties
          </div>
        )}
      </div>
    </div>
  );
}
