import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Product, DashboardSummary } from '../api';
import MetricCard from '../components/MetricCard';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

const STATUS_FILTERS = ['all', 'planning', 'in-progress', 'shipped', 'paused'] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([api.getDashboardSummary(), api.getProducts()]);
        setSummary(s);
        setProducts(p);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === 'all' ? products : products.filter(p => p.status === filter);

  async function handleCreate(data: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const created = await api.createProduct(data);
    setProducts(ps => [created, ...ps]);
    setSummary(s => s ? { ...s, totalProducts: s.totalProducts + 1 } : s);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-100">Dashboard</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Stay in the detail, across everything.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Product
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Products" value={summary?.totalProducts ?? 0} />
        <MetricCard label="Total MRR" value={`$${(summary?.totalMrr ?? 0).toLocaleString()}`} sub="monthly recurring revenue" />
        <MetricCard label="Total Users" value={(summary?.totalUsers ?? 0).toLocaleString()} />
        <MetricCard
          label="Shipped"
          value={summary?.statusBreakdown?.['shipped'] ?? 0}
          sub={`of ${summary?.totalProducts ?? 0} products`}
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-500 hover:text-neutral-200'
            }`}
          >
            {f}
            {f !== 'all' && summary?.statusBreakdown?.[f] !== undefined && (
              <span className="ml-1.5 opacity-60">{summary.statusBreakdown[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-dashed border-neutral-700">
          <p className="text-neutral-500 text-sm">No products yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-brand-500 text-sm font-medium hover:text-brand-400"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => navigate(`/products/${product.id}`)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <ProductModal
          title="New Product"
          onSave={handleCreate}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
