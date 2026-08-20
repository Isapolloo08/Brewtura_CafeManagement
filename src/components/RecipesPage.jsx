import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import { EditRecipeModal } from './EditRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import {
  PageHeader,
  StatCard,
  SectionCard,
  SearchInput,
  EmptyState,
  CountPill,
  ProgressBar,
  IconButton,
  toneOf,
} from './PageKit';
import api from '../services/api.js';

const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

const STATUS_TONE = { 'In Stock': 'emerald', 'Low Stock': 'amber', 'Out of Stock': 'red' };

function IngredientTile({ line, matched }) {
  const tone = matched ? STATUS_TONE[matched.status] || 'coffee' : 'coffee';
  const t = toneOf(tone);
  const isBlocked = matched?.status === 'Out of Stock';
  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-colors ${
        isBlocked ? 'bg-red-500/[0.06] border-red-500/25' : 'bg-[#FFFDF9]/80 border-amber-900/10 hover:border-[#C08552]/40'
      }`}
    >
      <div className="min-w-0">
        <p className="font-bold text-[#3C2A21] truncate">{line.name}</p>
        {matched ? (
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold mt-0.5 ${t.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            {num(matched.stock)}{matched.unit} on hand
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-900/35 mt-0.5 block">Not linked to stock</span>
        )}
      </div>
      <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-900/[0.06] border border-amber-900/10 font-extrabold text-[#693F27] tabular-nums whitespace-nowrap">
        {num(line.amount)} {line.unit}
      </span>
    </div>
  );
}

export function RecipesPage({ products, ingredients, can, onUpdateProduct }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [search, setSearch] = useState('');

  const ingredientById = useMemo(() => {
    const map = new Map();
    ingredients.forEach((ing) => map.set(String(ing.id), ing));
    return map;
  }, [ingredients]);

  const productsWithRecipe = useMemo(() => products.filter((p) => p.recipe && p.recipe.length > 0), [products]);
  const productsWithoutRecipe = useMemo(() => products.filter((p) => !p.recipe || p.recipe.length === 0), [products]);

  const totalLinks = useMemo(
    () => productsWithRecipe.reduce((sum, p) => sum + p.recipe.length, 0),
    [productsWithRecipe]
  );
  const coverage = products.length ? Math.round((productsWithRecipe.length / products.length) * 100) : 0;

  /* Recipes whose ingredients are low or fully out of stock. */
  const atRisk = useMemo(
    () =>
      productsWithRecipe.filter((p) =>
        p.recipe.some((line) => {
          const match = ingredientById.get(String(line.ingredientId));
          return match && match.status !== 'In Stock';
        })
      ).length,
    [productsWithRecipe, ingredientById]
  );

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productsWithRecipe;
    return productsWithRecipe.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.recipe.some((line) => String(line.name || '').toLowerCase().includes(q))
    );
  }, [productsWithRecipe, search]);

  const handleDeleteRecipe = async (product) => {
    const productId = parseInt(product.id, 10);
    if (productId) {
      try {
        await api.updateProductRecipe(productId, []);
      } catch (err) {
        console.warn('Failed to delete recipe from database:', err);
      }
    }
    onUpdateProduct({ ...product, recipe: [] });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        eyebrow="Ingredient BOM"
        title="Recipes"
        subtitle="Bill of Materials — link ingredients to products for automatic inventory deduction."
        icon={<Icons.Flask className="w-5 h-5" />}
      >
        <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-extrabold text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Auto-deduction active
        </span>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Icons.Flask className="w-5 h-5" />}
          label="Products With Recipes"
          value={productsWithRecipe.length.toLocaleString()}
          sub={`of ${products.length} products`}
          tone="coffee"
        />
        <StatCard
          icon={<Icons.Sprout className="w-5 h-5" />}
          label="Ingredient Links"
          value={totalLinks.toLocaleString()}
          sub="Total BOM lines"
          tone="emerald"
        />
        <StatCard
          icon={<Icons.Bell className="w-5 h-5" />}
          label="Recipes At Risk"
          value={atRisk.toLocaleString()}
          sub="Low or out-of-stock inputs"
          tone={atRisk > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={<Icons.ChartBar className="w-5 h-5" />}
          label="Recipe Coverage"
          value={`${coverage}%`}
          sub={`${productsWithoutRecipe.length} still missing`}
          tone={coverage === 100 ? 'emerald' : 'amber'}
        />
      </div>

      {products.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/60 px-6 py-4">
          <div className="flex items-center justify-between text-[11px] font-extrabold mb-2">
            <span className="text-[#3C2A21] uppercase tracking-[0.1em]">Menu Coverage</span>
            <span className="text-amber-900/50 tabular-nums">
              {productsWithRecipe.length} / {products.length} products mapped
            </span>
          </div>
          <ProgressBar pct={coverage} tone={coverage === 100 ? 'emerald' : 'coffee'} className="h-2" />
        </div>
      )}

      {productsWithoutRecipe.length > 0 && (
        <SectionCard
          icon={<Icons.Clipboard className="w-4 h-4" />}
          title="Products Without Recipes"
          hint={can('menu', 'edit') ? 'Click a product to build its recipe' : 'Read-only'}
          actions={<CountPill tone="amber">{productsWithoutRecipe.length} unmapped</CountPill>}
        >
          <div className="flex flex-wrap gap-2">
            {productsWithoutRecipe.map((product) =>
              can('menu', 'edit') ? (
                <button
                  key={product.id}
                  onClick={() => setEditingProduct(product)}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-900/[0.05] text-amber-900/65 border border-amber-900/10 hover:bg-[#3C2A21] hover:text-amber-100 hover:border-transparent transition-all"
                >
                  <Icons.Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  {product.name}
                </button>
              ) : (
                <span
                  key={product.id}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-900/[0.05] text-amber-900/60 border border-amber-900/10"
                >
                  {product.name}
                </span>
              )
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        icon={<Icons.CoffeeCup className="w-4 h-4" />}
        title="Configured Recipes"
        hint="Ingredient quantities consumed per unit sold"
        bodyClassName={filteredRecipes.length === 0 ? 'p-0' : 'p-6'}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Product or ingredient..."
              className="w-52"
            />
            <CountPill tone={filteredRecipes.length === productsWithRecipe.length ? 'coffee' : 'amber'}>
              {filteredRecipes.length} shown
            </CountPill>
          </>
        }
      >
        {filteredRecipes.length === 0 ? (
          <EmptyState
            icon={<Icons.Flask className="w-6 h-6" />}
            title={productsWithRecipe.length === 0 ? 'No recipes configured' : 'No recipes match your search'}
            hint={
              productsWithRecipe.length === 0
                ? 'Pick a product above to attach ingredients and enable automatic stock deduction.'
                : 'Try a different product or ingredient name.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((product) => {
              const lines = product.recipe.map((line) => ({
                line,
                matched: ingredientById.get(String(line.ingredientId)),
              }));
              const blocked = lines.filter((l) => l.matched?.status === 'Out of Stock').length;
              const low = lines.filter((l) => l.matched?.status === 'Low Stock').length;

              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-amber-900/10 bg-amber-900/[0.02] p-4 hover:border-[#C08552]/35 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3 mb-3.5">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-900/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-heading font-extrabold text-base text-[#3C2A21] truncate">{product.name}</h3>
                      <p className="text-[11px] text-amber-900/50 font-semibold">
                        {product.recipe.length} ingredient{product.recipe.length === 1 ? '' : 's'} per unit
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {blocked > 0 ? (
                        <CountPill tone="red">{blocked} out of stock</CountPill>
                      ) : low > 0 ? (
                        <CountPill tone="amber">{low} low stock</CountPill>
                      ) : (
                        <CountPill tone="emerald">All inputs available</CountPill>
                      )}
                      {can('menu', 'edit') && (
                        <IconButton
                          icon={<Icons.Edit className="w-3.5 h-3.5" />}
                          label="Edit recipe"
                          onClick={() => setEditingProduct(product)}
                        />
                      )}
                      {can('menu', 'delete') && (
                        <IconButton
                          icon={<Icons.Trash className="w-3.5 h-3.5" />}
                          label="Delete recipe"
                          tone="danger"
                          onClick={() => setDeletingProduct(product)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {lines.map(({ line, matched }, idx) => (
                      <IngredientTile key={idx} line={line} matched={matched} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <EditRecipeModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        ingredients={ingredients}
        onUpdateProduct={onUpdateProduct}
      />
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => handleDeleteRecipe(deletingProduct)}
        title="Delete Recipe"
        message={`Are you sure you want to remove the recipe for ${deletingProduct?.name || 'this product'}? Auto-inventory deduction will stop for this item.`}
        confirmLabel="Delete Recipe"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
