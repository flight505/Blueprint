/**
 * CitationVerificationPanel - Display and verify citations with status badges
 *
 * Features:
 * - Shows all citations with Verified/Unverified/Partial status badges
 * - Click citation to scroll to usage in document
 * - "Verify All" button for batch verification
 * - Shows verification source (OpenAlex/Crossref)
 */

import { useState, useEffect, useCallback } from 'react';

// Citation type from CitationManager (via preload)
interface ManagedCitation {
  id: string;
  number: number;
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  accessedAt: string;
  source: 'perplexity' | 'gemini' | 'manual' | 'imported';
  usages: Array<{
    claim: string;
    line?: number;
    offset?: number;
  }>;
}

// Citation file structure
interface CitationFile {
  version: '1.0';
  documentPath: string;
  updatedAt: string;
  citations: ManagedCitation[];
  nextNumber: number;
}

// Verification result from CitationVerificationService
interface VerificationResult {
  status: 'verified' | 'partial' | 'unverified' | 'error';
  confidence: number;
  source: 'openalex' | 'crossref' | 'cache' | null;
  matchedData?: VerifiedCitationData;
  error?: string;
  fromCache: boolean;
}

interface VerifiedCitationData {
  doi?: string;
  title?: string;
  authors?: string[];
  year?: number;
  publicationDate?: string;
  venue?: string;
  publisher?: string;
  openAlexId?: string;
  citedByCount?: number;
  abstract?: string;
  type?: string;
}

// Combined citation with verification status
interface VerifiedCitation extends ManagedCitation {
  verificationResult?: VerificationResult;
  isVerifying?: boolean;
}

interface CitationVerificationPanelProps {
  documentPath: string | null;
  onScrollToCitation?: (citationNumber: number, line?: number, offset?: number) => void;
  className?: string;
}

// Get status badge color
function getStatusColor(status?: VerificationResult['status']): string {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'unverified':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'error':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
}

// Get status badge text
function getStatusText(status?: VerificationResult['status']): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'partial':
      return 'Partial';
    case 'unverified':
      return 'Unverified';
    case 'error':
      return 'Error';
    default:
      return 'Pending';
  }
}

// Get source badge
function getSourceBadge(source: VerificationResult['source'] | null): string {
  switch (source) {
    case 'openalex':
      return 'OpenAlex';
    case 'crossref':
      return 'Crossref';
    case 'cache':
      return 'Cached';
    default:
      return '';
  }
}

// Format confidence as percentage
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export default function CitationVerificationPanel({
  documentPath,
  onScrollToCitation,
  className = '',
}: CitationVerificationPanelProps) {
  const [citations, setCitations] = useState<VerifiedCitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load citations when document path changes
  useEffect(() => {
    if (!documentPath) {
      setCitations([]);
      return;
    }

    async function loadCitations() {
      setIsLoading(true);
      setError(null);

      try {
        const citationFile: CitationFile = await window.electronAPI.citationLoadCitations(documentPath!);
        setCitations(citationFile.citations.map(c => ({ ...c })));
      } catch (err) {
        console.error('Failed to load citations:', err);
        setError('Failed to load citations');
        setCitations([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCitations();
  }, [documentPath]);

  // Verify a single citation
  const verifyCitation = useCallback(async (citation: VerifiedCitation) => {
    setCitations(prev => prev.map(c =>
      c.id === citation.id ? { ...c, isVerifying: true } : c
    ));

    try {
      const query = {
        title: citation.title,
        authors: citation.authors,
        url: citation.url,
        year: citation.date ? parseInt(citation.date.match(/\d{4}/)?.[0] || '', 10) || undefined : undefined,
      };

      const result = await window.electronAPI.citationVerifyCitation(query);

      setCitations(prev => prev.map(c =>
        c.id === citation.id ? { ...c, verificationResult: result, isVerifying: false } : c
      ));
    } catch (err) {
      console.error('Failed to verify citation:', err);
      setCitations(prev => prev.map(c =>
        c.id === citation.id ? {
          ...c,
          verificationResult: {
            status: 'error',
            confidence: 0,
            source: null,
            error: err instanceof Error ? err.message : 'Unknown error',
            fromCache: false,
          },
          isVerifying: false,
        } : c
      ));
    }
  }, []);

  // Verify all citations
  const verifyAllCitations = useCallback(async () => {
    if (citations.length === 0) return;

    setIsVerifyingAll(true);

    // Mark all as verifying
    setCitations(prev => prev.map(c => ({ ...c, isVerifying: true })));

    // Verify each citation sequentially to respect rate limits
    for (const citation of citations) {
      try {
        const query = {
          title: citation.title,
          authors: citation.authors,
          url: citation.url,
          year: citation.date ? parseInt(citation.date.match(/\d{4}/)?.[0] || '', 10) || undefined : undefined,
        };

        const result = await window.electronAPI.citationVerifyCitation(query);

        setCitations(prev => prev.map(c =>
          c.id === citation.id ? { ...c, verificationResult: result, isVerifying: false } : c
        ));
      } catch (err) {
        console.error('Failed to verify citation:', err);
        setCitations(prev => prev.map(c =>
          c.id === citation.id ? {
            ...c,
            verificationResult: {
              status: 'error',
              confidence: 0,
              source: null,
              error: err instanceof Error ? err.message : 'Unknown error',
              fromCache: false,
            },
            isVerifying: false,
          } : c
        ));
      }
    }

    setIsVerifyingAll(false);
  }, [citations]);

  // Toggle expanded state for citation details
  const toggleExpanded = useCallback((citationId: string) => {
    setExpandedCitationId(prev => prev === citationId ? null : citationId);
  }, []);

  // Calculate summary stats
  const stats = {
    total: citations.length,
    verified: citations.filter(c => c.verificationResult?.status === 'verified').length,
    partial: citations.filter(c => c.verificationResult?.status === 'partial').length,
    unverified: citations.filter(c => c.verificationResult?.status === 'unverified').length,
    pending: citations.filter(c => !c.verificationResult && !c.isVerifying).length,
  };

  // Render citation item
  const renderCitationItem = (citation: VerifiedCitation) => {
    const isExpanded = expandedCitationId === citation.id;
    const result = citation.verificationResult;

    return (
      <div
        key={citation.id}
        className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      >
        {/* Main row */}
        <div
          className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={() => toggleExpanded(citation.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded(citation.id);
            }
          }}
          aria-expanded={isExpanded}
          aria-label={`Citation ${citation.number}: ${citation.title}`}
        >
          <div className="flex items-start gap-3">
            {/* Citation number */}
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium">
              [{citation.number}]
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                  {citation.title}
                </h4>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {/* Verification status badge */}
                  {citation.isVerifying ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Verifying
                    </span>
                  ) : (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result?.status)}`}>
                      {getStatusText(result?.status)}
                    </span>
                  )}
                </div>
              </div>

              {/* Authors and source */}
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {citation.authors && citation.authors.length > 0 && (
                  <span className="truncate max-w-[200px]">
                    {citation.authors.length > 2
                      ? `${citation.authors[0]} et al.`
                      : citation.authors.join(', ')}
                  </span>
                )}
                {citation.date && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>{citation.date}</span>
                  </>
                )}
                {result?.source && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {getSourceBadge(result.source)}
                    </span>
                  </>
                )}
              </div>

              {/* Usages count */}
              {citation.usages.length > 0 && (
                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {citation.usages.length} usage{citation.usages.length !== 1 ? 's' : ''} in document
                </div>
              )}
            </div>

            {/* Expand indicator */}
            <span className={`flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-3 pl-14 space-y-3">
            {/* Verification details */}
            {result && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                    <span className="ml-2 font-medium">{formatConfidence(result.confidence)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Source:</span>
                    <span className="ml-2 font-medium">{getSourceBadge(result.source) || 'N/A'}</span>
                  </div>
                  {result.fromCache && (
                    <div className="col-span-2 text-gray-400 dark:text-gray-500">
                      From cache
                    </div>
                  )}
                  {result.error && (
                    <div className="col-span-2 text-red-600 dark:text-red-400">
                      Error: {result.error}
                    </div>
                  )}
                </div>

                {/* Matched data */}
                {result.matchedData && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Matched Data:</p>
                    {result.matchedData.doi && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        DOI: <a href={`https://doi.org/${result.matchedData.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{result.matchedData.doi}</a>
                      </p>
                    )}
                    {result.matchedData.venue && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Venue: {result.matchedData.venue}
                      </p>
                    )}
                    {result.matchedData.citedByCount !== undefined && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cited by: {result.matchedData.citedByCount}
                      </p>
                    )}
                    {result.matchedData.type && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Type: {result.matchedData.type}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Usages - click to scroll */}
            {citation.usages.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Usages:</p>
                {citation.usages.map((usage, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onScrollToCitation) {
                        onScrollToCitation(citation.number, usage.line, usage.offset);
                      }
                    }}
                    className="w-full text-left p-2 rounded text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={`Go to usage at line ${usage.line ?? 'unknown'}`}
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {usage.line ? `Line ${usage.line}:` : 'Usage:'}
                    </span>
                    <span className="ml-2 text-gray-700 dark:text-gray-300 line-clamp-1">
                      "{usage.claim}"
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  verifyCitation(citation);
                }}
                disabled={citation.isVerifying}
                className="px-3 py-1.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Verify citation ${citation.number}`}
              >
                {citation.isVerifying ? 'Verifying...' : 'Verify'}
              </button>
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Open source URL"
                >
                  Open URL
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render empty state
  if (!documentPath) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-sm">Citation Verification</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500 dark:text-gray-400">
          <div>
            <p className="text-sm">No document selected</p>
            <p className="text-xs mt-1">Open a document to view and verify citations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Citation Verification</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {citations.length} citation{citations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      {citations.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>{stats.verified} verified</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>{stats.partial} partial</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>{stats.unverified} unverified</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span>{stats.pending} pending</span>
            </span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Citation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : citations.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
            <div>
              <p className="text-sm">No citations found</p>
              <p className="text-xs mt-1">Citations will appear here when added to the document</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {citations.map(citation => renderCitationItem(citation))}
          </div>
        )}
      </div>

      {/* Footer with Verify All button */}
      {citations.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={verifyAllCitations}
            disabled={isVerifyingAll}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label="Verify all citations"
          >
            {isVerifyingAll ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying All Citations...
              </>
            ) : (
              'Verify All Citations'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
