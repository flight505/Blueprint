/**
 * CitationVerificationService - Verify citations using OpenAlex and Crossref APIs
 *
 * Features:
 * - OpenAlex API client with rate limiting (100K credits/day)
 * - Crossref API client with polite pool access (mailto header, 10 RPS)
 * - Hybrid query strategy based on available data
 * - Confidence scoring with weighted field matching (0.0-1.0)
 * - SQLite cache with tiered TTL (DOI: 7 days, search: 1 hour)
 */

import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// ==================== Types ====================

export interface VerificationResult {
  /** Verification status */
  status: 'verified' | 'partial' | 'unverified' | 'error';
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Which API verified this */
  source: 'openalex' | 'crossref' | 'cache' | null;
  /** Matched metadata from the API */
  matchedData?: VerifiedCitationData;
  /** Error message if verification failed */
  error?: string;
  /** Cache hit indicator */
  fromCache: boolean;
}

export interface VerifiedCitationData {
  /** DOI if found */
  doi?: string;
  /** Verified title */
  title?: string;
  /** Verified authors */
  authors?: string[];
  /** Publication year */
  year?: number;
  /** Publication date */
  publicationDate?: string;
  /** Journal/venue name */
  venue?: string;
  /** Publisher */
  publisher?: string;
  /** OpenAlex work ID */
  openAlexId?: string;
  /** Citation count */
  citedByCount?: number;
  /** Abstract (if available) */
  abstract?: string;
  /** Type of work (journal-article, book, etc.) */
  type?: string;
}

export interface CitationQuery {
  /** Title to search for */
  title?: string;
  /** Authors to search for */
  authors?: string[];
  /** DOI if known */
  doi?: string;
  /** Publication year (for filtering) */
  year?: number;
  /** URL of the source */
  url?: string;
}

export interface FieldMatchScore {
  field: string;
  inputValue: string;
  matchedValue: string;
  score: number;
  weight: number;
}

// CacheEntry interface documents the SQLite table structure (used in SQL queries)
// interface CacheEntry {
//   id: string;
//   query_hash: string;
//   query_type: 'doi' | 'search';
//   result: string; // JSON serialized VerificationResult
//   created_at: string;
//   expires_at: string;
// }

// ==================== Rate Limiter ====================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      // Wait for a token
      const waitTime = (1 / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// ==================== Field Matching Weights ====================

const FIELD_WEIGHTS = {
  doi: 1.0, // DOI match is definitive
  title: 0.4, // Title match is important
  authors: 0.3, // Authors contribute significantly
  year: 0.15, // Year is a good filter
  venue: 0.15, // Venue helps disambiguate
};

// ==================== Service Implementation ====================

export class CitationVerificationService {
  private db: Database.Database | null = null;
  private dbPath: string;

  // Rate limiters: Crossref allows 50 RPS for polite pool, we use 10 to be safe
  // OpenAlex has generous limits but we cap at 10 RPS
  private crossrefLimiter = new RateLimiter(10, 10);
  private openAlexLimiter = new RateLimiter(10, 10);

  // Contact email for polite pool access
  private readonly contactEmail = 'blueprint-app@users.noreply.github.com';

  // TTL values in seconds
  private readonly DOI_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly SEARCH_CACHE_TTL = 60 * 60; // 1 hour

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'citation-cache.db');
  }

  /**
   * Initialize the cache database
   */
  initialize(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create cache table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verification_cache (
        id TEXT PRIMARY KEY,
        query_hash TEXT NOT NULL UNIQUE,
        query_type TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `);

    // Create index on query_hash
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cache_query_hash ON verification_cache(query_hash);
      CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON verification_cache(expires_at);
    `);

    // Clean up expired entries on startup
    this.cleanupExpiredCache();

    console.log(`CitationVerificationService initialized at ${this.dbPath}`);
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Verify a citation using the hybrid query strategy
   */
  async verifyCitation(query: CitationQuery): Promise<VerificationResult> {
    // Check cache first
    const cached = this.getCachedResult(query);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      // Strategy 1: If DOI is provided, use direct lookup
      if (query.doi) {
        const result = await this.verifyByDOI(query.doi);
        if (result.status !== 'error') {
          this.cacheResult(query, result, 'doi');
          return result;
        }
      }

      // Strategy 2: Try OpenAlex first (usually faster and more complete)
      const openAlexResult = await this.searchOpenAlex(query);
      if (
        openAlexResult.status === 'verified' ||
        openAlexResult.confidence >= 0.7
      ) {
        this.cacheResult(query, openAlexResult, 'search');
        return openAlexResult;
      }

      // Strategy 3: Try Crossref for additional matches
      const crossrefResult = await this.searchCrossref(query);
      if (
        crossrefResult.status === 'verified' ||
        crossrefResult.confidence >= 0.7
      ) {
        this.cacheResult(query, crossrefResult, 'search');
        return crossrefResult;
      }

      // Return the better result between OpenAlex and Crossref
      const bestResult =
        openAlexResult.confidence >= crossrefResult.confidence
          ? openAlexResult
          : crossrefResult;

      this.cacheResult(query, bestResult, 'search');
      return bestResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        confidence: 0,
        source: null,
        error: errorMessage,
        fromCache: false,
      };
    }
  }

  /**
   * Batch verify multiple citations
   */
  async verifyCitations(
    queries: CitationQuery[]
  ): Promise<Map<number, VerificationResult>> {
    const results = new Map<number, VerificationResult>();

    for (let i = 0; i < queries.length; i++) {
      const result = await this.verifyCitation(queries[i]);
      results.set(i, result);
    }

    return results;
  }

  /**
   * Verify by DOI (direct lookup)
   */
  private async verifyByDOI(doi: string): Promise<VerificationResult> {
    // Normalize DOI
    const normalizedDOI = this.normalizeDOI(doi);
    if (!normalizedDOI) {
      return {
        status: 'error',
        confidence: 0,
        source: null,
        error: 'Invalid DOI format',
        fromCache: false,
      };
    }

    // Try Crossref first for DOI lookups (more authoritative for DOIs)
    await this.crossrefLimiter.acquire();

    try {
      const response = await fetch(
        `https://api.crossref.org/works/${encodeURIComponent(normalizedDOI)}`,
        {
          headers: {
            'User-Agent': `Blueprint/1.0 (mailto:${this.contactEmail})`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const work = data.message;
        const matchedData = this.parseCrossrefWork(work);

        return {
          status: 'verified',
          confidence: 1.0, // DOI match is definitive
          source: 'crossref',
          matchedData,
          fromCache: false,
        };
      }
    } catch {
      // Continue to OpenAlex
    }

    // Try OpenAlex
    await this.openAlexLimiter.acquire();

    try {
      const response = await fetch(
        `https://api.openalex.org/works/doi:${encodeURIComponent(normalizedDOI)}`,
        {
          headers: {
            'User-Agent': `Blueprint/1.0 (mailto:${this.contactEmail})`,
          },
        }
      );

      if (response.ok) {
        const work = await response.json();
        const matchedData = this.parseOpenAlexWork(work);

        return {
          status: 'verified',
          confidence: 1.0,
          source: 'openalex',
          matchedData,
          fromCache: false,
        };
      }
    } catch {
      // DOI not found
    }

    return {
      status: 'unverified',
      confidence: 0,
      source: null,
      error: 'DOI not found in academic databases',
      fromCache: false,
    };
  }

  /**
   * Search OpenAlex API
   */
  private async searchOpenAlex(
    query: CitationQuery
  ): Promise<VerificationResult> {
    await this.openAlexLimiter.acquire();

    const searchParams = new URLSearchParams();

    // Build search query
    const filters: string[] = [];

    if (query.title) {
      searchParams.set('search', query.title);
    }

    if (query.year) {
      filters.push(`publication_year:${query.year}`);
    }

    if (filters.length > 0) {
      searchParams.set('filter', filters.join(','));
    }

    searchParams.set('per_page', '5');

    try {
      const url = `https://api.openalex.org/works?${searchParams.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': `Blueprint/1.0 (mailto:${this.contactEmail})`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAlex API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      if (results.length === 0) {
        return {
          status: 'unverified',
          confidence: 0,
          source: 'openalex',
          fromCache: false,
        };
      }

      // Find best match and calculate confidence
      let bestMatch = null;
      let bestConfidence = 0;

      for (const work of results) {
        const { confidence } = this.calculateMatchConfidence(
          query,
          this.parseOpenAlexWork(work)
        );
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = work;
        }
      }

      if (bestMatch && bestConfidence > 0) {
        const matchedData = this.parseOpenAlexWork(bestMatch);
        return {
          status: bestConfidence >= 0.8 ? 'verified' : 'partial',
          confidence: bestConfidence,
          source: 'openalex',
          matchedData,
          fromCache: false,
        };
      }

      return {
        status: 'unverified',
        confidence: 0,
        source: 'openalex',
        fromCache: false,
      };
    } catch (error) {
      return {
        status: 'error',
        confidence: 0,
        source: 'openalex',
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false,
      };
    }
  }

  /**
   * Search Crossref API
   */
  private async searchCrossref(
    query: CitationQuery
  ): Promise<VerificationResult> {
    await this.crossrefLimiter.acquire();

    const searchParams = new URLSearchParams();
    searchParams.set('rows', '5');

    // Build query
    const queryParts: string[] = [];

    if (query.title) {
      queryParts.push(query.title);
    }

    if (query.authors && query.authors.length > 0) {
      queryParts.push(query.authors.join(' '));
    }

    if (queryParts.length === 0) {
      return {
        status: 'unverified',
        confidence: 0,
        source: 'crossref',
        fromCache: false,
      };
    }

    searchParams.set('query', queryParts.join(' '));

    if (query.year) {
      searchParams.set(
        'filter',
        `from-pub-date:${query.year},until-pub-date:${query.year}`
      );
    }

    try {
      const url = `https://api.crossref.org/works?${searchParams.toString()}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': `Blueprint/1.0 (mailto:${this.contactEmail})`,
        },
      });

      if (!response.ok) {
        throw new Error(`Crossref API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.message?.items || [];

      if (items.length === 0) {
        return {
          status: 'unverified',
          confidence: 0,
          source: 'crossref',
          fromCache: false,
        };
      }

      // Find best match
      let bestMatch = null;
      let bestConfidence = 0;

      for (const work of items) {
        const matchedData = this.parseCrossrefWork(work);
        const { confidence } = this.calculateMatchConfidence(
          query,
          matchedData
        );
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = work;
        }
      }

      if (bestMatch && bestConfidence > 0) {
        const matchedData = this.parseCrossrefWork(bestMatch);
        return {
          status: bestConfidence >= 0.8 ? 'verified' : 'partial',
          confidence: bestConfidence,
          source: 'crossref',
          matchedData,
          fromCache: false,
        };
      }

      return {
        status: 'unverified',
        confidence: 0,
        source: 'crossref',
        fromCache: false,
      };
    } catch (error) {
      return {
        status: 'error',
        confidence: 0,
        source: 'crossref',
        error: error instanceof Error ? error.message : 'Unknown error',
        fromCache: false,
      };
    }
  }

  /**
   * Calculate match confidence with weighted field matching
   */
  private calculateMatchConfidence(
    query: CitationQuery,
    matchedData: VerifiedCitationData
  ): { confidence: number; scores: FieldMatchScore[] } {
    const scores: FieldMatchScore[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Title match (fuzzy)
    if (query.title && matchedData.title) {
      const titleScore = this.fuzzyMatch(query.title, matchedData.title);
      scores.push({
        field: 'title',
        inputValue: query.title,
        matchedValue: matchedData.title,
        score: titleScore,
        weight: FIELD_WEIGHTS.title,
      });
      weightedScore += titleScore * FIELD_WEIGHTS.title;
      totalWeight += FIELD_WEIGHTS.title;
    }

    // Author match (fuzzy, any author match counts)
    if (query.authors && query.authors.length > 0 && matchedData.authors) {
      const authorScore = this.matchAuthors(query.authors, matchedData.authors);
      scores.push({
        field: 'authors',
        inputValue: query.authors.join(', '),
        matchedValue: matchedData.authors.join(', '),
        score: authorScore,
        weight: FIELD_WEIGHTS.authors,
      });
      weightedScore += authorScore * FIELD_WEIGHTS.authors;
      totalWeight += FIELD_WEIGHTS.authors;
    }

    // Year match (exact)
    if (query.year && matchedData.year) {
      const yearScore = query.year === matchedData.year ? 1.0 : 0;
      scores.push({
        field: 'year',
        inputValue: String(query.year),
        matchedValue: String(matchedData.year),
        score: yearScore,
        weight: FIELD_WEIGHTS.year,
      });
      weightedScore += yearScore * FIELD_WEIGHTS.year;
      totalWeight += FIELD_WEIGHTS.year;
    }

    // DOI match (exact) - if both present, definitive
    if (query.doi && matchedData.doi) {
      const normalizedQueryDOI = this.normalizeDOI(query.doi);
      const normalizedMatchDOI = this.normalizeDOI(matchedData.doi);
      if (
        normalizedQueryDOI &&
        normalizedMatchDOI &&
        normalizedQueryDOI.toLowerCase() === normalizedMatchDOI.toLowerCase()
      ) {
        return {
          confidence: 1.0,
          scores: [
            {
              field: 'doi',
              inputValue: query.doi,
              matchedValue: matchedData.doi,
              score: 1.0,
              weight: FIELD_WEIGHTS.doi,
            },
          ],
        };
      }
    }

    // Calculate final confidence
    const confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;

    return { confidence, scores };
  }

  /**
   * Fuzzy string matching (Jaccard similarity on words)
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    const words1 = new Set(normalize(str1));
    const words2 = new Set(normalize(str2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Match author names with fuzzy matching
   */
  private matchAuthors(queryAuthors: string[], matchedAuthors: string[]): number {
    if (queryAuthors.length === 0 || matchedAuthors.length === 0) return 0;

    const normalizeAuthor = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    let matchCount = 0;

    for (const queryAuthor of queryAuthors) {
      const queryParts = normalizeAuthor(queryAuthor);

      for (const matchedAuthor of matchedAuthors) {
        const matchedParts = normalizeAuthor(matchedAuthor);

        // Check if last name matches (most important)
        const queryLast = queryParts[queryParts.length - 1];
        const matchedLast = matchedParts[matchedParts.length - 1];

        if (queryLast && matchedLast && queryLast === matchedLast) {
          matchCount++;
          break;
        }

        // Check if any significant part matches
        const commonParts = queryParts.filter(
          (p) => p.length > 2 && matchedParts.includes(p)
        );
        if (commonParts.length > 0) {
          matchCount += 0.5;
          break;
        }
      }
    }

    return Math.min(1.0, matchCount / queryAuthors.length);
  }

  /**
   * Parse OpenAlex work response
   */
  private parseOpenAlexWork(work: Record<string, unknown>): VerifiedCitationData {
    const authors: string[] = [];
    const authorships = (work.authorships || []) as Array<{
      author?: { display_name?: string };
    }>;
    for (const authorship of authorships) {
      if (authorship.author?.display_name) {
        authors.push(authorship.author.display_name);
      }
    }

    const source = work.primary_location as { source?: { display_name?: string } } | undefined;
    const venue = source?.source?.display_name;

    return {
      doi: (work.doi as string)?.replace('https://doi.org/', ''),
      title: work.title as string | undefined,
      authors,
      year: work.publication_year as number | undefined,
      publicationDate: work.publication_date as string | undefined,
      venue,
      publisher: undefined, // OpenAlex doesn't directly provide publisher
      openAlexId: work.id as string | undefined,
      citedByCount: work.cited_by_count as number | undefined,
      abstract:
        work.abstract_inverted_index
          ? this.reconstructAbstract(work.abstract_inverted_index as Record<string, number[]>)
          : undefined,
      type: work.type as string | undefined,
    };
  }

  /**
   * Parse Crossref work response
   */
  private parseCrossrefWork(work: Record<string, unknown>): VerifiedCitationData {
    const authors: string[] = [];
    const authorList = (work.author || []) as Array<{ given?: string; family?: string }>;
    for (const author of authorList) {
      if (author.given && author.family) {
        authors.push(`${author.given} ${author.family}`);
      } else if (author.family) {
        authors.push(author.family);
      }
    }

    const published = work['published-print'] || work['published-online'] || work.created;
    const dateParts = (published as { 'date-parts'?: number[][] })?.['date-parts']?.[0];
    const year = dateParts?.[0];
    const publicationDate = dateParts
      ? dateParts
          .map((p) => String(p).padStart(2, '0'))
          .slice(0, 3)
          .join('-')
      : undefined;

    const titleArr = work.title as string[] | undefined;
    const containerTitle = work['container-title'] as string[] | undefined;

    return {
      doi: work.DOI as string | undefined,
      title: titleArr?.[0],
      authors,
      year,
      publicationDate,
      venue: containerTitle?.[0],
      publisher: work.publisher as string | undefined,
      citedByCount: work['is-referenced-by-count'] as number | undefined,
      type: work.type as string | undefined,
    };
  }

  /**
   * Reconstruct abstract from OpenAlex inverted index
   */
  private reconstructAbstract(invertedIndex: Record<string, number[]>): string {
    const words: Array<[string, number]> = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words.push([word, pos]);
      }
    }

    words.sort((a, b) => a[1] - b[1]);
    return words.map(([word]) => word).join(' ');
  }

  /**
   * Normalize DOI to standard format
   */
  private normalizeDOI(doi: string): string | null {
    if (!doi) return null;

    // Remove common prefixes
    let normalized = doi
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:/i, '')
      .trim();

    // Validate DOI format (starts with 10.)
    if (!/^10\.\d{4,}\//.test(normalized)) {
      return null;
    }

    return normalized;
  }

  /**
   * Generate cache key hash
   */
  private generateCacheKey(query: CitationQuery): string {
    const normalizedQuery = {
      doi: query.doi ? this.normalizeDOI(query.doi) : undefined,
      title: query.title?.toLowerCase().trim(),
      authors: query.authors?.map((a) => a.toLowerCase().trim()).sort(),
      year: query.year,
    };

    // Simple hash function
    const str = JSON.stringify(normalizedQuery);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(query: CitationQuery): VerificationResult | null {
    if (!this.db) return null;

    const hash = this.generateCacheKey(query);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      SELECT result FROM verification_cache
      WHERE query_hash = ? AND expires_at > ?
    `);

    const row = stmt.get(hash, now) as { result: string } | undefined;

    if (row) {
      try {
        return JSON.parse(row.result) as VerificationResult;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Cache a verification result
   */
  private cacheResult(
    query: CitationQuery,
    result: VerificationResult,
    queryType: 'doi' | 'search'
  ): void {
    if (!this.db) return;

    const hash = this.generateCacheKey(query);
    const ttl = queryType === 'doi' ? this.DOI_CACHE_TTL : this.SEARCH_CACHE_TTL;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const id = `cache_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const stmt = this.db.prepare(`
      INSERT INTO verification_cache (id, query_hash, query_type, result, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(query_hash) DO UPDATE SET
        result = excluded.result,
        expires_at = excluded.expires_at
    `);

    stmt.run(id, hash, queryType, JSON.stringify(result), expiresAt);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    if (!this.db) return;

    const now = new Date().toISOString();
    const stmt = this.db.prepare('DELETE FROM verification_cache WHERE expires_at < ?');
    const result = stmt.run(now);

    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): number {
    if (!this.db) return 0;

    const stmt = this.db.prepare('DELETE FROM verification_cache');
    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; expiredEntries: number; cacheSize: number } {
    if (!this.db) return { totalEntries: 0, expiredEntries: 0, cacheSize: 0 };

    const now = new Date().toISOString();

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM verification_cache');
    const totalEntries = (totalStmt.get() as { count: number }).count;

    const expiredStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM verification_cache WHERE expires_at < ?'
    );
    const expiredEntries = (expiredStmt.get(now) as { count: number }).count;

    let cacheSize = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      cacheSize = stats.size;
    } catch {
      // File might not exist
    }

    return { totalEntries, expiredEntries, cacheSize };
  }
}

// Singleton instance
export const citationVerificationService = new CitationVerificationService();
