import React, { useMemo, useState } from 'react';
import { X, Search, BookOpen } from 'lucide-react';
import { JAVA_GLOSSARY } from '../data/charactersAndBadges';

interface GlossaryModalProps {
  open: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(JAVA_GLOSSARY.map((item) => item.category)));
    return ['All', ...unique];
  }, []);

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return JAVA_GLOSSARY.filter((t) => {
      const catMatch = selectedCategory === 'All' || t.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.simpleDefinition.toLowerCase().includes(q) ||
        t.javaExample.toLowerCase().includes(q)
      );
    });
  }, [query, selectedCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col rounded-2xl border border-stone-200 dark:border-emerald-900/70 bg-[#F5F1E6] dark:bg-[#14221B] text-[#202923] dark:text-stone-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-emerald-900/60 bg-white/70 dark:bg-[#192B22]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#2F7D46] dark:text-[#F5C451]" />
            <div>
              <h2 id="glossary-modal-title" className="text-lg font-bold">
                CODELAND Java Glossary
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Plain-English Java reference for explorers ({JAVA_GLOSSARY.length} core terms)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-200/70 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
            aria-label="Close Java Glossary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="px-6 py-3.5 border-b border-stone-200 dark:border-emerald-900/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Java keywords (e.g., class, int, boolean, constructor, loop)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 dark:border-emerald-800/80 bg-white dark:bg-[#0F1A14] text-sm focus:outline-none focus:border-[#2F7D46]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2F7D46] text-white'
                    : 'bg-stone-200/80 dark:bg-[#1D3127] text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-[#264033]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Terms List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12 text-sm text-stone-500 dark:text-stone-400">
              No Java glossary terms matched &ldquo;{query}&rdquo;. Try searching for <code>int</code>,{' '}
              <code>method</code>, or <code>class</code>.
            </div>
          ) : (
            filteredTerms.map((item) => (
              <div
                key={item.term}
                className="p-4 rounded-xl border border-stone-200/90 dark:border-emerald-900/50 bg-white dark:bg-[#192B22] space-y-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-mono font-bold text-base text-[#173B2B] dark:text-[#F5C451]">
                    {item.term}
                  </h3>
                  <span className="text-xs text-stone-500 dark:text-stone-400">{item.category}</span>
                </div>
                <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                  {item.simpleDefinition}
                </p>
                <pre className="p-2.5 rounded-lg bg-[#101A14] text-emerald-300 font-mono text-xs overflow-x-auto">
                  <code>{item.javaExample}</code>
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
