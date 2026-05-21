import { useState, useEffect } from 'react';
import { api, Digest, DigestData } from '../api';

export default function DigestPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [selected, setSelected] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  useEffect(() => {
    api.getDigests()
      .then(ds => {
        setDigests(ds);
        if (ds.length > 0) loadDigest(ds[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadDigest(id: string) {
    setLoading(true);
    try {
      const d = await api.getDigest(id);
      setSelected(d);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const d = await api.generateDigest();
      setDigests(ds => [d, ...ds]);
      setSelected(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate digest');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setSentMsg('');
    setError('');
    try {
      await api.sendDigest(selected.id);
      setSelected(d => d ? { ...d, sent_at: new Date().toISOString() } : d);
      setDigests(ds => ds.map(d => d.id === selected.id ? { ...d, sent_at: new Date().toISOString() } : d));
      setSentMsg('Digest sent to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-100">Weekly Digest</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Your portfolio, summarised for the week</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />Generating...</>
          ) : 'Generate Digest'}
        </button>
      </div>

      {error && <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</div>}
      {sentMsg && <div className="mb-6 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">{sentMsg}</div>}

      {digests.length === 0 && !generating ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-dashed border-neutral-700">
          <p className="text-neutral-300 font-medium mb-1">No digests yet</p>
          <p className="text-neutral-600 text-sm mb-4">Generate your first weekly digest to see a summary of what's been built.</p>
          <button onClick={handleGenerate} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            Generate Digest
          </button>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar — history */}
          {digests.length > 1 && (
            <div className="w-36 shrink-0 space-y-1">
              {digests.map(d => (
                <button
                  key={d.id}
                  onClick={() => loadDigest(d.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selected?.id === d.id
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                  }`}
                >
                  <p className="font-medium">{new Date(d.period_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  {d.sent_at && <p className="text-neutral-600 mt-0.5">Sent</p>}
                </button>
              ))}
            </div>
          )}

          {/* Main digest view */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>
            ) : selected ? (
              <DigestView digest={selected} onSend={handleSend} sending={sending} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function DigestView({ digest, onSend, sending }: { digest: Digest; onSend: () => void; sending: boolean }) {
  const data = digest.data as DigestData | undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-600">
            {new Date(digest.period_from).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {new Date(digest.period_to).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {data && (
            <p className="text-xs text-neutral-600 mt-0.5">
              {data.totalSessions} session{data.totalSessions !== 1 ? 's' : ''} · {data.activeProducts.length} active product{data.activeProducts.length !== 1 ? 's' : ''}
              {data.releases.length > 0 && ` · ${data.releases.length} release${data.releases.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {digest.sent_at && <span className="text-xs text-neutral-600">Sent {new Date(digest.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          <button
            onClick={onSend}
            disabled={sending}
            className="text-sm font-medium text-brand-400 border border-brand-500/30 hover:bg-brand-500/10 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {sending ? 'Sending...' : digest.sent_at ? 'Resend' : 'Send to email'}
          </button>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
        <p className="text-neutral-200 leading-relaxed">{digest.narrative}</p>
      </div>

      {/* Active products */}
      {data?.activeProducts && data.activeProducts.length > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-800">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">This week</p>
          </div>
          {data.activeProducts.map((p, i) => (
            <div key={p.id} className={`px-5 py-4 ${i < data.activeProducts.length - 1 ? 'border-b border-neutral-800/60' : ''}`}>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="font-medium text-neutral-100">{p.name}</span>
                <span className="text-xs text-neutral-600">{p.sessionCount} session{p.sessionCount !== 1 ? 's' : ''}</span>
                {p.releases.map((r, ri) => (
                  <span key={ri} className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.type === 'ios' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    r.type === 'android' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}>
                    {r.name}{r.build_number ? ` #${r.build_number}` : ''}
                  </span>
                ))}
              </div>
              {p.built.length > 0 && (
                <ul className="space-y-0.5">
                  {p.built.slice(0, 5).map((item, i) => (
                    <li key={i} className="text-xs text-neutral-500 flex gap-2">
                      <span className="shrink-0 text-neutral-700">—</span>{item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stagnant */}
      {data?.stagnant && data.stagnant.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">No activity</p>
          <div className="flex flex-wrap gap-2">
            {data.stagnant.map(p => (
              <span key={p.id} className="text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg">
                {p.name}{p.daysSince ? <span className="text-neutral-700 ml-1">{p.daysSince}d</span> : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
