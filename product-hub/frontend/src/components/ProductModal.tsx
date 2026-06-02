import { useState } from 'react';
import { Product } from '../api';

type ProductForm = Pick<Product, 'name' | 'description' | 'status' | 'stage' | 'mrr' | 'active_users' | 'url'>;

interface ProductModalProps {
  initial?: Partial<Product>;
  onSave: (data: ProductForm) => Promise<void>;
  onClose: () => void;
  title: string;
}

const STATUSES: Product['status'][] = ['planning', 'in-progress', 'shipped', 'paused'];
const STAGES: Product['stage'][] = ['idea', 'validation', 'mvp', 'growth', 'stable'];

const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500';
const labelClass = 'block text-xs font-medium text-neutral-500 mb-1.5';

export default function ProductModal({ initial, onSave, onClose, title }: ProductModalProps) {
  const [form, setForm] = useState<ProductForm>({
    name: initial?.name || '',
    description: initial?.description || '',
    status: initial?.status || 'planning',
    stage: initial?.stage || 'idea',
    mrr: initial?.mrr || 0,
    active_users: initial?.active_users || 0,
    url: initial?.url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-100">{title}</h2>
          <button onClick={onClose} className="text-neutral-600 hover:text-neutral-300 text-2xl leading-none transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className={labelClass}>Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Product"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>URL</label>
            <input
              type="url"
              value={form.url || ''}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://myproduct.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What does this product do?"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Product['status'] }))} className={inputClass}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as Product['stage'] }))} className={inputClass}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>MRR ($)</label>
              <input type="number" min="0" value={form.mrr} onChange={e => setForm(f => ({ ...f, mrr: parseFloat(e.target.value) || 0 }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Active Users</label>
              <input type="number" min="0" value={form.active_users} onChange={e => setForm(f => ({ ...f, active_users: parseInt(e.target.value) || 0 }))} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
