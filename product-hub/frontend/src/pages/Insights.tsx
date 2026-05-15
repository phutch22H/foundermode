import { useState, useEffect } from 'react';
import { api, Insight } from '../api';
import InsightCard from '../components/InsightCard';

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getInsights()
      .then(setInsights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const insight = await api.generateInsights();
      setInsights(is => [insight, ...is]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights. Check your API key.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteInsight(id);
    setInsights(is => is.filter(i => i.id !== id));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-100">Insights</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Portfolio analysis powered by Claude</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <>
              <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
              Analyzing...
            </>
          ) : (
            'Generate Insights'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {insights.length === 0 && !generating ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-dashed border-neutral-700">
          <p className="text-neutral-300 font-medium mb-1">No insights yet</p>
          <p className="text-neutral-600 text-sm mb-4">Generate your first portfolio analysis to see opportunities and trends.</p>
          <button
            onClick={handleGenerate}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Generate Insights
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {insights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDelete={() => handleDelete(insight.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
