import { useState } from 'react';
import { Note } from '../api';

interface ReleaseModalProps {
  shippedTasks: Note[];
  onSave: (data: { name: string; description: string; noteIds: string[]; released_at: string; type: string; build_number: string }) => Promise<void>;
  onClose: () => void;
}

const inputClass = 'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500';
const labelClass = 'block text-xs font-medium text-neutral-500 mb-1.5';

export default function ReleaseModal({ shippedTasks, onSave, onClose }: ReleaseModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('web');
  const [buildNumber, setBuildNumber] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(shippedTasks.map(t => t.id)));
  const [releasedAt, setReleasedAt] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleTask(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Release name is required'); return; }
    if (selectedIds.size === 0) { setError('Select at least one shipped task'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), description: description.trim(), noteIds: Array.from(selectedIds), released_at: new Date(releasedAt).toISOString(), type, build_number: buildNumber.trim() });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create release');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-neutral-100">New Release</h2>
          <button onClick={onClose} className="text-neutral-600 hover:text-neutral-300 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <div>
              <label className={labelClass}>Release Name *</label>
              <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="v1.0, Build 68, May drop..." className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
                  <option value="ios">iOS Build</option>
                  <option value="android">Android Build</option>
                  <option value="web">Web</option>
                </select>
              </div>
              {(type === 'ios' || type === 'android') && (
                <div>
                  <label className={labelClass}>Build Number</label>
                  <input type="text" value={buildNumber} onChange={e => setBuildNumber(e.target.value)} placeholder="68" className={inputClass} />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Release Date</label>
              <input type="datetime-local" value={releasedAt} onChange={e => setReleasedAt(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Release Notes (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="High-level summary of what changed..." className={`${inputClass} resize-none`} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass.replace('mb-1.5', 'mb-0')}>Shipped Tasks</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedIds(new Set(shippedTasks.map(t => t.id)))} className="text-xs text-neutral-500 hover:text-neutral-300">all</button>
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-neutral-500 hover:text-neutral-300">none</button>
                </div>
              </div>
              {shippedTasks.length === 0 ? (
                <p className="text-sm text-neutral-600 text-center py-4">No shipped tasks yet.</p>
              ) : (
                <div className="space-y-1 border border-neutral-800 rounded-lg p-2 bg-neutral-950/50">
                  {shippedTasks.map(task => (
                    <label key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-neutral-800/50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleTask(task.id)} className="mt-0.5 rounded border-neutral-600 bg-neutral-700 text-brand-600 focus:ring-brand-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300 leading-snug">{task.content}</p>
                        {task.completed_at && (
                          <p className="text-xs text-neutral-600 mt-0.5">Shipped {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-neutral-800 flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Creating...' : `Create Release (${selectedIds.size})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
