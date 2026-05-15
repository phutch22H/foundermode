import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, Product, Note, Release } from '../api';
import ProductModal from '../components/ProductModal';
import ReleaseModal from '../components/ReleaseModal';
import { STATUS_COLORS, STAGE_COLORS } from '../components/ProductCard';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskInput, setTaskInput] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [p, n, r] = await Promise.all([
          api.getProduct(id!),
          api.getNotes(id!),
          api.getReleases(id!),
        ]);
        setProduct(p);
        setNotes(n);
        setReleases(r);
      } catch {
        navigate('/products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskInput.trim() || !id) return;
    setAddingTask(true);
    try {
      const note = await api.createNote(id, taskInput.trim());
      setNotes(ns => [note, ...ns]);
      setTaskInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggle(note: Note) {
    setTogglingId(note.id);
    try {
      const updated = await api.completeNote(note.id, !note.completed);
      setNotes(ns => ns.map(n => n.id === updated.id ? updated : n));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteNote(noteId: string) {
    await api.deleteNote(noteId);
    setNotes(ns => ns.filter(n => n.id !== noteId));
  }

  async function handleCreateRelease(data: { name: string; description: string; noteIds: string[]; released_at: string }) {
    if (!id) return;
    const release = await api.createRelease(id, data);
    setReleases(rs => [release, ...rs]);
  }

  async function handleDeleteRelease(releaseId: string) {
    if (!confirm('Delete this release? Tasks will not be affected.')) return;
    await api.deleteRelease(releaseId);
    setReleases(rs => rs.filter(r => r.id !== releaseId));
  }

  async function handleDelete() {
    if (!product || !confirm(`Delete "${product.name}" and all its tasks?`)) return;
    await api.deleteProduct(product.id);
    navigate('/products');
  }

  async function handleUpdate(data: Partial<Product>) {
    if (!product) return;
    const updated = await api.updateProduct(product.id, data);
    setProduct(updated);
    setShowEdit(false);
  }

  const connectSnippet = useCallback((dir: string) => {
    const token = localStorage.getItem('ph_token') ?? '<your-token>';
    const apiUrl = window.location.origin === 'http://localhost:5173'
      ? 'http://localhost:3000'
      : window.location.origin;
    return JSON.stringify({
      apiUrl,
      token,
      projects: { [dir || '/path/to/your/project']: product?.id },
    }, null, 2);
  }, [product?.id]);

  function copySnippet(dir: string) {
    navigator.clipboard.writeText(connectSnippet(dir));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  }

  if (!product) return null;

  const tasks = notes.filter(n => n.source !== 'claude-code');
  const activeTasks = tasks.filter(n => !n.completed);
  const shippedTasks = tasks.filter(n => n.completed);
  const activityLog = notes.filter(n => n.source === 'claude-code');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/products')} className="text-neutral-600 hover:text-neutral-300 text-sm transition-colors">&larr; Products</button>
      </div>

      {/* Product header */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-2xl font-semibold text-neutral-100">{product.name}</h2>
          <div className="flex gap-2 shrink-0">
            <Link to={`/products/${id}/context`} className="text-sm text-neutral-400 border border-neutral-700 hover:bg-neutral-800 hover:text-neutral-200 px-3 py-1.5 rounded-lg transition-colors">Context</Link>
            <button onClick={() => setShowEdit(true)} className="text-sm text-neutral-400 border border-neutral-700 hover:bg-neutral-800 hover:text-neutral-200 px-3 py-1.5 rounded-lg transition-colors">Edit</button>
            <button onClick={handleDelete} className="text-sm text-red-500/70 border border-red-500/20 hover:bg-red-500/10 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors">Delete</button>
          </div>
        </div>

        {product.description && (
          <p className="text-neutral-400 mb-5 leading-relaxed">{product.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[product.status] || ''}`}>{product.status}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STAGE_COLORS[product.stage] || ''}`}>{product.stage}</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
            <p className="text-2xl font-bold text-neutral-100">${(product.mrr || 0).toLocaleString()}</p>
            <p className="text-xs text-neutral-500 mt-1">MRR</p>
          </div>
          <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
            <p className="text-2xl font-bold text-neutral-100">{(product.active_users || 0).toLocaleString()}</p>
            <p className="text-xs text-neutral-500 mt-1">Users</p>
          </div>
          <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
            <p className="text-2xl font-bold text-neutral-100">{activeTasks.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Open Tasks</p>
          </div>
          <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
            <p className="text-2xl font-bold text-neutral-100">{releases.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Releases</p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-5">
        <h3 className="font-semibold text-neutral-100 mb-4">Tasks</h3>
        <form onSubmit={handleAddTask} className="flex gap-3 mb-6">
          <input
            type="text"
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={addingTask || !taskInput.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {activeTasks.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-6">No open tasks.</p>
        ) : (
          <div className="space-y-1">
            {activeTasks.map(task => (
              <TaskRow key={task.id} task={task} toggling={togglingId === task.id} onToggle={() => handleToggle(task)} onDelete={() => handleDeleteNote(task.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Shipped */}
      {shippedTasks.length > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-100">
              Shipped
              <span className="ml-2 text-xs font-normal text-neutral-500">{shippedTasks.length} completed</span>
            </h3>
            <button
              onClick={() => setShowReleaseModal(true)}
              className="text-xs font-medium text-brand-400 border border-brand-500/30 hover:bg-brand-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              + New Release
            </button>
          </div>
          <div className="space-y-1">
            {shippedTasks.map(task => (
              <TaskRow key={task.id} task={task} toggling={togglingId === task.id} onToggle={() => handleToggle(task)} onDelete={() => handleDeleteNote(task.id)} shipped />
            ))}
          </div>
        </div>
      )}

      {/* Releases */}
      {releases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-100">Releases</h3>
            {shippedTasks.length > 0 && (
              <button
                onClick={() => setShowReleaseModal(true)}
                className="text-xs font-medium text-brand-400 border border-brand-500/30 hover:bg-brand-500/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                + New Release
              </button>
            )}
          </div>
          {releases.map(release => (
            <ReleaseCard key={release.id} release={release} onDelete={() => handleDeleteRelease(release.id)} />
          ))}
        </div>
      )}

      {/* Empty state for releases when no shipped tasks yet */}
      {releases.length === 0 && shippedTasks.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-sm">
          Complete tasks to create your first release.
        </div>
      )}

      {/* Activity log — Claude Code sessions */}
      {activityLog.length > 0 && (
        <div className="mt-6 bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h3 className="font-semibold text-neutral-100 mb-4">
            Activity
            <span className="ml-2 text-xs font-normal text-neutral-500">{activityLog.length} sessions</span>
          </h3>
          <div className="space-y-3">
            {activityLog.map(entry => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Connect to Claude Code */}
      <div className="mt-6 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <button
          onClick={() => setShowConnect(c => !c)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors group"
        >
          <div>
            <p className="text-sm font-medium text-neutral-300">Connect to Claude Code</p>
            <p className="text-xs text-neutral-600 mt-0.5">Route Claude Code sessions in a directory to this product</p>
          </div>
          <svg
            className={`w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-all ${showConnect ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {showConnect && (
          <div className="border-t border-neutral-800 p-5 space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Create or update <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-300">~/.founder-mode.json</code> with this content.
                Each session started from that directory will automatically log to this product.
              </p>
              <p className="text-xs text-neutral-600">
                Replace <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-400">/path/to/your/project</code> with your actual directory.
                To connect multiple products, add more entries to <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-400">projects</code>.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-400 font-mono overflow-x-auto leading-relaxed">
                {connectSnippet('/path/to/your/project')}
              </pre>
              <button
                onClick={() => copySnippet('/path/to/your/project')}
                className="absolute top-3 right-3 text-xs text-neutral-600 hover:text-neutral-300 bg-neutral-900 border border-neutral-700 px-2 py-1 rounded transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-neutral-800/50 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-brand-400 text-xs mt-0.5 shrink-0">→</span>
              <p className="text-xs text-neutral-500">
                The hook fires automatically when any Claude Code session ends.
                No extra commands needed — just work normally in that directory.
              </p>
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <ProductModal title="Edit Product" initial={product} onSave={handleUpdate} onClose={() => setShowEdit(false)} />
      )}
      {showReleaseModal && (
        <ReleaseModal
          shippedTasks={shippedTasks}
          onSave={handleCreateRelease}
          onClose={() => setShowReleaseModal(false)}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

interface TaskRowProps {
  task: Note;
  toggling: boolean;
  onToggle: () => void;
  onDelete: () => void;
  shipped?: boolean;
}

function TaskRow({ task, toggling, onToggle, onDelete, shipped }: TaskRowProps) {
  return (
    <div className="flex items-start gap-3 group py-2 px-1 rounded-lg hover:bg-neutral-800/50 transition-colors">
      <button
        onClick={onToggle}
        disabled={toggling}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-50 ${
          shipped ? 'bg-green-600 border-green-600 text-white' : 'border-neutral-600 hover:border-brand-500'
        }`}
      >
        {shipped && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${shipped ? 'line-through text-neutral-600' : 'text-neutral-300'}`}>
          {task.content}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-neutral-600">Created {formatDate(task.created_at)}</span>
          {shipped && task.completed_at && (
            <span className="text-xs text-green-600">Shipped {formatDate(task.completed_at)}</span>
          )}
          {task.tags?.map(tag => (
            <span key={tag} className="text-xs bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-neutral-800 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none shrink-0 mt-0.5"
      >
        &times;
      </button>
    </div>
  );
}

function ActivityRow({ entry }: { entry: Note }) {
  const time = new Date(entry.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const parts: Record<string, string> = {};
  entry.content.split(' | ').forEach(seg => {
    const colon = seg.indexOf(': ');
    if (colon !== -1) parts[seg.slice(0, colon).trim()] = seg.slice(colon + 2).trim();
  });
  const task = parts['Task'] ?? entry.content;
  const tools = parts['Tools'];

  return (
    <div className="flex gap-3 group">
      <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-neutral-700 mt-2" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-300 leading-snug">{task}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-neutral-600">{time}</span>
          {tools && <span className="text-xs text-neutral-600">{tools}</span>}
        </div>
      </div>
    </div>
  );
}

function ReleaseCard({ release, onDelete }: { release: Release; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="font-semibold text-neutral-100">{release.name}</h4>
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 font-medium px-2 py-0.5 rounded-full">
              {release.tasks.length} {release.tasks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">{formatShort(release.released_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-neutral-600 hover:text-neutral-300 px-2 py-1 transition-colors"
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
          <button onClick={onDelete} className="text-neutral-700 hover:text-red-400 transition-colors text-lg leading-none">&times;</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-800 px-5 pb-5 pt-4 space-y-3">
          {release.description && (
            <p className="text-sm text-neutral-400 leading-relaxed pb-3 border-b border-neutral-800">
              {release.description}
            </p>
          )}
          {release.tasks.length === 0 ? (
            <p className="text-sm text-neutral-600">No tasks linked.</p>
          ) : (
            <ul className="space-y-2">
              {release.tasks.map(task => (
                <li key={task.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm text-neutral-300">{task.content}</p>
                    {task.completed_at && (
                      <p className="text-xs text-neutral-600 mt-0.5">Shipped {formatDate(task.completed_at)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
