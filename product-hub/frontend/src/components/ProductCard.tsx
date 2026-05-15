import { Product } from '../api';

export const STATUS_COLORS: Record<string, string> = {
  planning:     'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'in-progress':'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  shipped:      'bg-green-500/10 text-green-400 border border-green-500/20',
  paused:       'bg-neutral-800 text-neutral-500 border border-neutral-700',
};

export const STAGE_COLORS: Record<string, string> = {
  idea:       'bg-purple-500/10 text-purple-400',
  validation: 'bg-orange-500/10 text-orange-400',
  mvp:        'bg-blue-500/10 text-blue-400',
  growth:     'bg-teal-500/10 text-teal-400',
  stable:     'bg-green-500/10 text-green-400',
};

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl p-5 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-neutral-100 truncate group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[product.status] || ''}`}>
          {product.status}
        </span>
      </div>

      {product.description && (
        <p className="text-sm text-neutral-500 mb-4 line-clamp-2 leading-relaxed">{product.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STAGE_COLORS[product.stage] || ''}`}>
          {product.stage}
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-neutral-200">
            ${(product.mrr || 0).toLocaleString()}
            <span className="text-xs text-neutral-600 font-normal">/mo</span>
          </p>
          <p className="text-xs text-neutral-600">{product.active_users || 0} users</p>
        </div>
      </div>
    </div>
  );
}
