import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Product } from '../api';
import ProductModal from '../components/ProductModal';
import { STATUS_COLORS, STAGE_COLORS } from '../components/ProductCard';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: Partial<Product>) {
    const created = await api.createProduct(data);
    setProducts(ps => [created, ...ps]);
  }

  async function handleUpdate(data: Partial<Product>) {
    if (!editingProduct) return;
    const updated = await api.updateProduct(editingProduct.id, data);
    setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
    setEditingProduct(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product and all its notes?')) return;
    setDeletingId(id);
    try {
      await api.deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleInlineEdit(product: Product, field: 'mrr' | 'active_users', value: number) {
    const updated = await api.updateProduct(product.id, { [field]: value });
    setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-100">Products</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{products.length} products in your portfolio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => api.exportCsv()}
            className="border border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Product
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-dashed border-neutral-700">
          <p className="text-neutral-500 text-sm">No products yet.</p>
          <button onClick={() => setShowAddModal(true)} className="mt-3 text-brand-500 text-sm font-medium hover:text-brand-400">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">MRR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Users</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="font-medium text-neutral-200 hover:text-brand-400 text-left transition-colors"
                    >
                      {product.name}
                    </button>
                    {product.description && (
                      <p className="text-xs text-neutral-600 mt-0.5 truncate max-w-xs">{product.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[product.status] || ''}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[product.stage] || ''}`}>
                      {product.stage}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <input
                      type="number"
                      defaultValue={product.mrr}
                      onBlur={e => {
                        const val = parseFloat(e.target.value) || 0;
                        if (val !== product.mrr) handleInlineEdit(product, 'mrr', val);
                      }}
                      className="text-right w-24 bg-transparent border border-transparent hover:border-neutral-700 focus:border-brand-500 focus:outline-none rounded px-1 py-0.5 text-sm text-neutral-300"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <input
                      type="number"
                      defaultValue={product.active_users}
                      onBlur={e => {
                        const val = parseInt(e.target.value) || 0;
                        if (val !== product.active_users) handleInlineEdit(product, 'active_users', val);
                      }}
                      className="text-right w-20 bg-transparent border border-transparent hover:border-neutral-700 focus:border-brand-500 focus:outline-none rounded px-1 py-0.5 text-sm text-neutral-300"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-xs text-neutral-500 hover:text-neutral-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="text-xs text-red-500/70 hover:text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <ProductModal title="New Product" onSave={handleCreate} onClose={() => setShowAddModal(false)} />
      )}
      {editingProduct && (
        <ProductModal title="Edit Product" initial={editingProduct} onSave={handleUpdate} onClose={() => setEditingProduct(null)} />
      )}
    </div>
  );
}
