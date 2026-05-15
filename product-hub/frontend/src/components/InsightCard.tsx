import { Insight } from '../api';

interface ParsedInsight {
  summary?: string;
  opportunities?: string[];
  validationGaps?: string[];
  financialTrends?: string;
  nextActions?: string[];
}

interface InsightCardProps {
  insight: Insight;
  onDelete?: () => void;
}

export default function InsightCard({ insight, onDelete }: InsightCardProps) {
  let parsed: ParsedInsight | null = null;
  try {
    parsed = JSON.parse(insight.content);
  } catch {
    // plain text fallback
  }

  const date = new Date(insight.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Portfolio Analysis</span>
          <p className="text-xs text-neutral-600 mt-0.5">{date}</p>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-neutral-700 hover:text-red-400 transition-colors text-xl leading-none">&times;</button>
        )}
      </div>

      {parsed ? (
        <div className="p-5 space-y-5">
          {parsed.summary && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Summary</h4>
              <p className="text-sm text-neutral-300 leading-relaxed">{parsed.summary}</p>
            </div>
          )}
          {parsed.opportunities && parsed.opportunities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Opportunities</h4>
              <ul className="space-y-1.5">
                {parsed.opportunities.map((item, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex gap-2">
                    <span className="text-green-500 shrink-0 mt-0.5">+</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsed.validationGaps && parsed.validationGaps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Validation Gaps</h4>
              <ul className="space-y-1.5">
                {parsed.validationGaps.map((item, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex gap-2">
                    <span className="text-yellow-500 shrink-0 mt-0.5">!</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsed.financialTrends && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Financial Trends</h4>
              <p className="text-sm text-neutral-300 leading-relaxed">{parsed.financialTrends}</p>
            </div>
          )}
          {parsed.nextActions && parsed.nextActions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Next Actions</h4>
              <ul className="space-y-1.5">
                {parsed.nextActions.map((item, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex gap-2">
                    <span className="text-brand-400 shrink-0 mt-0.5">&rsaquo;</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{insight.content}</p>
        </div>
      )}
    </div>
  );
}
