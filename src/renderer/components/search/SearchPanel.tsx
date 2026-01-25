import { useState, useEffect, useCallback, useRef } from 'react';

interface SearchMatch {
  line: number;
  column: number;
  content: string;
  match: string;
}

interface SearchResult {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

interface SearchPanelProps {
  projectPath: string | null;
  onFileSelect: (filePath: string, line?: number) => void;
}

export function SearchPanel({ projectPath, onFileSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total matches
  useEffect(() => {
    const total = results.reduce((sum, result) => sum + result.matches.length, 0);
    setTotalMatches(total);
  }, [results]);

  // Perform search with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!projectPath || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await window.electronAPI.searchInFiles(
        projectPath,
        searchQuery,
        { useRegex, caseSensitive, maxResults: 500 }
      );
      setResults(searchResults);

      // Auto-expand first 3 files with results
      const firstThree = searchResults.slice(0, 3).map(r => r.filePath);
      setExpandedFiles(new Set(firstThree));
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [projectPath, useRegex, caseSensitive]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Re-search when options change (immediate)
  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query);
    }
  }, [useRegex, caseSensitive]);

  const toggleFileExpanded = (filePath: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleMatchClick = (filePath: string, line: number) => {
    onFileSelect(filePath, line);
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Highlight match in text
  const highlightMatch = (content: string, matchText: string) => {
    const escaped = matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${escaped})`, caseSensitive ? 'g' : 'gi');
    const parts = content.split(pattern);

    return parts.map((part, i) => {
      const isMatch = pattern.test(part);
      pattern.lastIndex = 0; // Reset regex
      return isMatch ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-700 text-inherit px-0.5 rounded">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      );
    });
  };

  if (!projectPath) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-gray-500 dark:text-gray-400 text-center mt-8">
          <p className="text-sm">No project folder selected</p>
          <p className="text-xs mt-2">Open a folder in Explorer to enable search</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search input and options */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in project..."
            className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            aria-label="Search query"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search options */}
        <div className="flex gap-4 mt-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
            />
            <span>Match Case</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
            />
            <span>Use Regex</span>
          </label>
        </div>

        {/* Results summary */}
        {query.trim().length >= 2 && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {isSearching ? (
              'Searching...'
            ) : results.length > 0 ? (
              `${totalMatches} result${totalMatches !== 1 ? 's' : ''} in ${results.length} file${results.length !== 1 ? 's' : ''}`
            ) : (
              'No results found'
            )}
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query.trim().length >= 2 && !isSearching ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No results found for "{query}"</p>
            <p className="text-xs mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="py-1">
            {results.map((result) => (
              <div key={result.filePath} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                {/* File header */}
                <button
                  onClick={() => toggleFileExpanded(result.filePath)}
                  className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                  aria-expanded={expandedFiles.has(result.filePath)}
                >
                  <span className="text-gray-400 text-xs">
                    {expandedFiles.has(result.filePath) ? '▼' : '▶'}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {result.relativePath}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {result.matches.length}
                  </span>
                </button>

                {/* Matches list */}
                {expandedFiles.has(result.filePath) && (
                  <div className="bg-gray-50 dark:bg-gray-800/50">
                    {result.matches.map((match, idx) => (
                      <button
                        key={`${match.line}-${match.column}-${idx}`}
                        onClick={() => handleMatchClick(result.filePath, match.line)}
                        className="w-full px-4 py-1.5 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                        title={`Go to line ${match.line}`}
                      >
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-8 text-right flex-shrink-0">
                          {match.line}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate flex-1">
                          {highlightMatch(match.content, match.match)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for managing search panel keyboard shortcut
export function useSearchPanel() {
  const [isSearchPanelFocused, setIsSearchPanelFocused] = useState(false);

  const focusSearchPanel = useCallback(() => {
    setIsSearchPanelFocused(true);
  }, []);

  const blurSearchPanel = useCallback(() => {
    setIsSearchPanelFocused(false);
  }, []);

  return {
    isSearchPanelFocused,
    focusSearchPanel,
    blurSearchPanel,
  };
}
