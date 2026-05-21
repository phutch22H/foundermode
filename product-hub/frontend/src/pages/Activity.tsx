import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ActivityEntry } from '../api';

function parseSession(content: string) {
  const parts: Record<string, string> = {};
  content.split(' | ').forEach(segment => {
    const colon = segment.indexOf(': ');
    if (colon !== -1) {
      parts[segment.slice(0, colon).trim()] = segment.slice(colon + 2).trim();
    }
  });
  return parts;
}

function groupByDate(entries: ActivityEntry[]) {
  const groups: { label: string; entries: ActivityEntry[] }[] = [];
  const map = new Map<string, ActivityEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    if (!map.has(label)) {
      map.set(label, []);
      groups.push({ label, entries: map.get(label)! });
    }
    map.get(label)!.push(entry);
  }

  return groups;
}

export default function Activity() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivity(100)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  }

  const groups = groupByDate(entries);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-neutral-100">Activity</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Claude Code sessions across all products</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-dashed border-neutral-700">
          <p className="text-neutral-300 font-medium mb-1">No activity yet</p>
          <p className="text-neutral-600 text-sm">Claude Code sessions will appear here automatically at the end of each session.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2 px-1">{group.label}</h3>
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                {group.entries.map((entry, i) => (
                  <SessionRow
                    key={entry.id}
                    entry={entry}
                    isLast={i === group.entries.length - 1}
                    onProductClick={() => navigate(`/products/${entry.product_id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ entry, isLast, onProductClick }: {
  entry: ActivityEntry;
  isLast: boolean;
  onProductClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parts = parseSession(entry.content);
  const task = parts['Task'] ?? entry.content;
  const time = new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const fullTime = new Date(entry.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const tools = parts['Tools']
    ? parts['Tools'].split(', ').map(t => {
        const [name, count] = t.split('×');
        return { name: name.trim(), count: count ? parseInt(count) : 1 };
      })
    : [];

  const sessionRaw = parts['Session'] ?? '';
  const sessionId = sessionRaw.split(' ')[0];
  const model = sessionRaw.match(/\(([^)]+)\)/)?.[1] ?? '';

  return (
    <div className={!isLast ? 'border-b border-neutral-800/70' : ''}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-4 hover:bg-neutral-800/40 transition-colors group"
      >
        {/* Time */}
        <span className="shrink-0 text-xs text-neutral-600 w-12 tabular-nums">{time}</span>

        {/* Divider dot */}
        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-neutral-700 group-hover:bg-brand-500/60 transition-colors" />

        {/* Task summary */}
        <span className="flex-1 min-w-0 text-sm text-neutral-300 truncate">{task}</span>

        {/* Product badge */}
        <span
          onClick={e => { e.stopPropagation(); onProductClick(); }}
          className="shrink-0 text-xs text-brand-400 hover:text-brand-300 hover:underline transition-colors"
        >
          {entry.product_name}
        </span>

        {/* Expand chevron */}
        <svg
          className={`shrink-0 w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-400 transition-all ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-800/70 bg-neutral-950/40">
          {/* Full task */}
          <p className="text-sm text-neutral-200 leading-relaxed mb-4">{task}</p>

          {/* Built */}
          {parts['Built'] && (
            <div className="mb-4">
              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-2">Built / Changed</p>
              <ul className="space-y-1">
                {parts['Built'].split(' · ').map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                    <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-neutral-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {parts['Decisions'] && (
            <div className="mb-4">
              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-2">Decisions</p>
              <ul className="space-y-1">
                {parts['Decisions'].split(' · ').map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                    <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-neutral-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current state */}
          {parts['State'] && (
            <div className="mb-4">
              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">Current State</p>
              <p className="text-xs text-neutral-400">{parts['State']}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
            {/* Timestamp */}
            <div>
              <p className="text-neutral-600 uppercase tracking-wider mb-0.5">Timestamp</p>
              <p className="text-neutral-400">{fullTime}</p>
            </div>

            {/* Session ID */}
            {sessionId && (
              <div>
                <p className="text-neutral-600 uppercase tracking-wider mb-0.5">Session ID</p>
                <p className="text-neutral-400 font-mono">{sessionId}</p>
              </div>
            )}

            {/* Model */}
            {model && (
              <div>
                <p className="text-neutral-600 uppercase tracking-wider mb-0.5">Model</p>
                <p className="text-neutral-400">{model}</p>
              </div>
            )}

            {/* Product */}
            <div>
              <p className="text-neutral-600 uppercase tracking-wider mb-0.5">Product</p>
              <button
                onClick={onProductClick}
                className="text-brand-400 hover:text-brand-300 hover:underline transition-colors"
              >
                {entry.product_name}
              </button>
            </div>
          </div>

          {/* Tools */}
          {tools.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-neutral-600 uppercase tracking-wider mb-2">Tools Used</p>
              <div className="flex gap-2 flex-wrap">
                {tools.map(({ name, count }) => (
                  <span key={name} className="text-xs bg-neutral-800 border border-neutral-700 text-neutral-400 px-2.5 py-1 rounded-lg">
                    {name}
                    {count > 1 && <span className="ml-1.5 text-neutral-600">×{count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
