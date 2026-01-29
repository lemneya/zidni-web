import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import type { SearchResult } from '../services/zidniApi';

interface SearchResultsProps {
  results: SearchResult[];
  onClose: () => void;
}

export function SearchResults({ results, onClose }: SearchResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-3 border-t border-kimi-border bg-blue-50"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-blue-900 font-arabic">
          🔍 نتائج البحث من الويب
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors"
        >
          <X className="w-4 h-4 text-blue-700" />
        </button>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {results.map((result, index) => (
          <a
            key={index}
            href={result.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-medium text-blue-800 font-arabic line-clamp-1">
                {result.title}
              </h4>
              <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0 mr-2" />
            </div>
            <p className="text-xs text-blue-600 mt-1 font-arabic line-clamp-2">
              {result.snippet}
            </p>
            <p className="text-xs text-blue-400 mt-1 truncate">
              {result.link}
            </p>
          </a>
        ))}
      </div>
    </motion.div>
  );
}
