import { useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar';

function daysLeft(endDate) {
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatSGD(amount) {
  return `S$${Number(amount).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

export default function CampaignCard({ fra, isFavourited = false, onFavouriteClick, matchPct }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => navigate(`/fra/${fra.id}`)}
    >
      <div className="relative bg-gray-200 h-44 w-full flex items-center justify-center">
        <span className="text-gray-400 text-xs">Campaign image</span>
        {matchPct && (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded">
            {matchPct}% MATCH
          </span>
        )}
        {onFavouriteClick && (
          <button
            className="absolute top-3 right-3 text-xl leading-none transition-colors hover:scale-110"
            onClick={(e) => { e.stopPropagation(); onFavouriteClick(fra.id); }}
            aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
          >
            <span className={isFavourited ? 'text-gray-900' : 'text-gray-300'}>♥</span>
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">{fra.title}</h3>
        <div className="flex gap-2 mb-3 flex-wrap">
          {fra.category && (
            <span className="border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-600">
              {fra.category}
            </span>
          )}
          {fra.location_text && (
            <span className="border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-600">
              {fra.location_text}
            </span>
          )}
        </div>
        <ProgressBar current={fra.current_amount} target={fra.target_amount} />
        <div className="flex justify-between text-xs text-gray-500 mt-1.5">
          <span>{formatSGD(fra.current_amount)} of {formatSGD(fra.target_amount)}</span>
          <span>{daysLeft(fra.end_date)}d left</span>
        </div>
      </div>
    </div>
  );
}
