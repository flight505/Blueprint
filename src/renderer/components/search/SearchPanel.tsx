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

interface FlatMatch {
  filePath: string;
  relativePath: string;
  line: number;
  column: number;
  content: string;
  match: string;
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
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [flatMatches, setFlatMatches] = useState<FlatMatch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const matchRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Calculate total matches and create flat matches array
  useEffect(() => {
    const total = results.reduce((sum, result) => sum + result.matches.length, 0);
    setTotalMatches(total);

    // Create flattened array of all matches for navigation
    const flat: FlatMatch[] = [];
    results.forEach(result => {
      result.matches.forEach(match => {
        flat.push({
          filePath: result.filePath,
          relativePath: result.relativePath,
          line: match.line,
          column: match.column,
          content: match.content,
          match: match.match,
        });
      });
    });
    setFlatMatches(flat);

    // Reset current match index when results change
    if (flat.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
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

  // Navigate to a specific match by index
  const navigateToMatch = useCallback((index: number) => {
    if (index < 0 || index >= flatMatches.length) return;

    const match = flatMatches[index];
    setCurrentMatchIndex(index);

    // Expand the file containing this match
    setExpandedFiles(prev => new Set(prev).add(match.filePath));

    // Navigate to the file and line
    onFileSelect(match.filePath, match.line);

    // Scroll the match into view
    const matchKey = `${match.filePath}-${match.line}-${match.column}`;
    const matchElement = matchRefs.current.get(matchKey);
    if (matchElement) {
      matchElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [flatMatches, onFileSelect]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (flatMatches.length === 0) return;
    const nextIndex = currentMatchIndex < flatMatches.length - 1 ? currentMatchIndex + 1 : 0;
    navigateToMatch(nextIndex);
  }, [currentMatchIndex, flatMatches.length, navigateToMatch]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (flatMatches.length === 0) return;
    const prevIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : flatMatches.length - 1;
    navigateToMatch(prevIndex);
  }, [currentMatchIndex, flatMatches.length, navigateToMatch]);

  // Get the index of a match in the flat array
  const getMatchIndex = useCallback((filePath: string, line: number, column: number): number => {
    return flatMatches.findIndex(
      m => m.filePath === filePath && m.line === line && m.column === column
    );
  }, [flatMatches]);

  const handleMatchClick = (filePath: string, line: number, column: number) => {
    const matchIndex = getMatchIndex(filePath, line, column);
    if (matchIndex !== -1) {
      setCurrentMatchIndex(matchIndex);
    }
    onFileSelect(filePath, line);
  };

  // Keyboard shortcuts for navigation (F3 for next, Shift+F3 for previous)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
      }
      // Also support Cmd+G / Cmd+Shift+G (common in many editors)
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextMatch, goToPreviousMatch]);

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

        {/* Results summary and navigation */}
        {query.trim().length >= 2 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isSearching ? (
                'Searching...'
              ) : results.length > 0 ? (
                <>
                  <span className="font-medium">
                    {currentMatchIndex >= 0 ? `${currentMatchIndex + 1} of ${totalMatches}` : `${totalMatches} result${totalMatches !== 1 ? 's' : ''}`}
                  </span>
                  <span className="ml-1">
                    in {results.length} file{results.length !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                'No results found'
              )}
            </div>

            {/* Navigation buttons */}
            {!isSearching && totalMatches > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPreviousMatch}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  title="Previous match (Shift+F3)"
                  aria-label="Go to previous match"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={goToNextMatch}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50"
                  title="Next match (F3)"
                  aria-label="Go to next match"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
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
                    {result.matches.map((match, idx) => {
                      const matchKey = `${result.filePath}-${match.line}-${match.column}`;
                      const matchIndex = getMatchIndex(result.filePath, match.line, match.column);
                      const isCurrentMatch = matchIndex === currentMatchIndex;

                      return (
                        <button
                          key={`${match.line}-${match.column}-${idx}`}
                          ref={(el) => {
                            if (el) {
                              matchRefs.current.set(matchKey, el);
                            } else {
                              matchRefs.current.delete(matchKey);
                            }
                          }}
                          onClick={() => handleMatchClick(result.filePath, match.line, match.column)}
                          className={`w-full px-4 py-1.5 flex items-start gap-3 text-left transition-colors ${
                            isCurrentMatch
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 border-l-2 border-yellow-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={`Go to line ${match.line}${isCurrentMatch ? ' (current)' : ''}`}
                          aria-current={isCurrentMatch ? 'true' : undefined}
                        >
                          <span className={`text-xs font-mono w-8 text-right flex-shrink-0 ${
                            isCurrentMatch
                              ? 'text-yellow-700 dark:text-yellow-400 font-semibold'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {match.line}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate flex-1">
                            {highlightMatch(match.content, match.match)}
                          </span>
                        </button>
                      );
                    })}
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
