import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'node:fs';

// Mock fs module
vi.mock('node:fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Import after mocking
import {
  citationManager,
  type Citation,
  type CitationFile,
  type AddCitationInput,
} from './CitationManager';

describe('CitationManager', () => {
  const testDocPath = '/test/project/document.md';
  const expectedCitationPath = '/test/project/document.citations.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCitationFilePath', () => {
    it('generates correct sidecar file path', () => {
      const result = citationManager.getCitationFilePath(testDocPath);
      expect(result).toBe(expectedCitationPath);
    });

    it('handles different file extensions', () => {
      expect(citationManager.getCitationFilePath('/test/file.txt')).toBe(
        '/test/file.citations.json'
      );
      expect(citationManager.getCitationFilePath('/test/report.docx')).toBe(
        '/test/report.citations.json'
      );
    });

    it('handles paths with multiple dots', () => {
      expect(
        citationManager.getCitationFilePath('/test/file.name.with.dots.md')
      ).toBe('/test/file.name.with.dots.citations.json');
    });
  });

  describe('loadCitations', () => {
    it('loads existing citation file', async () => {
      const existingCitations: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'cit_123',
            number: 1,
            url: 'https://example.com',
            title: 'Example',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 2,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(existingCitations)
      );

      const result = await citationManager.loadCitations(testDocPath);
      expect(result).toEqual(existingCitations);
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        expectedCitationPath,
        'utf-8'
      );
    });

    it('creates new citation file when none exists', async () => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(
        new Error('ENOENT: no such file')
      );

      const result = await citationManager.loadCitations(testDocPath);
      expect(result.version).toBe('1.0');
      expect(result.documentPath).toBe(testDocPath);
      expect(result.citations).toEqual([]);
      expect(result.nextNumber).toBe(1);
    });
  });

  describe('saveCitations', () => {
    it('writes citation file with updated timestamp', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.writeFile).mockResolvedValue();

      await citationManager.saveCitations(testDocPath, citationFile);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expectedCitationPath,
        expect.any(String),
        'utf-8'
      );

      // Verify the written content has an updated timestamp
      const writtenContent = vi.mocked(fs.promises.writeFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent as string);
      expect(new Date(parsed.updatedAt).getTime()).toBeGreaterThan(
        new Date('2024-01-01').getTime()
      );
    });
  });

  describe('addCitation', () => {
    beforeEach(() => {
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.promises.writeFile).mockResolvedValue();
    });

    it('adds a new citation with auto-incrementing number', async () => {
      const input: AddCitationInput = {
        url: 'https://example.com/article',
        title: 'Test Article',
        source: 'perplexity',
      };

      const result = await citationManager.addCitation(testDocPath, input);

      expect(result.number).toBe(1);
      expect(result.url).toBe(input.url);
      expect(result.title).toBe(input.title);
      expect(result.source).toBe('perplexity');
      expect(result.id).toMatch(/^cit_\d+_[a-z0-9]+$/);
    });

    it('adds citation with optional fields', async () => {
      const input: AddCitationInput = {
        url: 'https://example.com/paper',
        title: 'Research Paper',
        authors: ['John Doe', 'Jane Smith'],
        date: '2024-01-15',
        publisher: 'Academic Press',
        source: 'gemini',
        claim: 'This is a supporting claim',
        line: 10,
      };

      const result = await citationManager.addCitation(testDocPath, input);

      expect(result.authors).toEqual(['John Doe', 'Jane Smith']);
      expect(result.date).toBe('2024-01-15');
      expect(result.publisher).toBe('Academic Press');
      expect(result.usages).toHaveLength(1);
      expect(result.usages[0].claim).toBe('This is a supporting claim');
    });

    it('returns existing citation and adds usage when URL already exists', async () => {
      const existingCitations: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'existing_123',
            number: 1,
            url: 'https://example.com/existing',
            title: 'Existing Article',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 2,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(existingCitations)
      );

      const input: AddCitationInput = {
        url: 'https://example.com/existing',
        title: 'Existing Article',
        source: 'perplexity',
        claim: 'New usage claim',
      };

      const result = await citationManager.addCitation(testDocPath, input);

      expect(result.id).toBe('existing_123'); // Same citation
      expect(result.number).toBe(1); // Same number
      expect(result.usages).toHaveLength(1); // New usage added
      expect(result.usages[0].claim).toBe('New usage claim');
    });
  });

  describe('formatIEEE', () => {
    it('formats citation with all fields', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com/paper',
        title: 'Test Paper Title',
        authors: ['John Doe', 'Jane Smith'],
        date: 'Jan. 2024',
        publisher: 'IEEE',
        accessedAt: '2024-01-15T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatIEEE(citation);

      expect(result).toContain('[1]');
      expect(result).toContain('J. Doe');
      expect(result).toContain('J. Smith');
      expect(result).toContain('"Test Paper Title,"');
      expect(result).toContain('IEEE');
      expect(result).toContain('Jan. 2024');
      expect(result).toContain('[Online]. Available:');
      expect(result).toContain('https://example.com/paper');
      expect(result).toContain('[Accessed:');
    });

    it('formats citation without optional fields', () => {
      const citation: Citation = {
        id: 'test',
        number: 5,
        url: 'https://example.com',
        title: 'Simple Title',
        accessedAt: '2024-06-20T00:00:00.000Z',
        source: 'imported',
        usages: [],
      };

      const result = citationManager.formatIEEE(citation);

      expect(result).toContain('[5]');
      expect(result).toContain('"Simple Title,"');
      expect(result).not.toContain('undefined');
    });

    it('handles single author', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Solo Author Paper',
        authors: ['Alice Wonderland'],
        accessedAt: '2024-01-01T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatIEEE(citation);
      expect(result).toContain('A. Wonderland');
      expect(result).not.toContain(' and ');
    });

    it('handles two authors with "and"', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Duo Author Paper',
        authors: ['Alice Wonderland', 'Bob Builder'],
        accessedAt: '2024-01-01T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatIEEE(citation);
      expect(result).toContain('A. Wonderland and B. Builder');
    });

    it('handles three or more authors with commas and "and"', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Multi Author Paper',
        authors: ['Alice Wonderland', 'Bob Builder', 'Charlie Chocolate'],
        accessedAt: '2024-01-01T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatIEEE(citation);
      expect(result).toContain('A. Wonderland, B. Builder, and C. Chocolate');
    });

    it('respects includeUrl option', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Test',
        accessedAt: '2024-01-01T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const withUrl = citationManager.formatIEEE(citation, { includeUrl: true });
      const withoutUrl = citationManager.formatIEEE(citation, {
        includeUrl: false,
      });

      expect(withUrl).toContain('https://example.com');
      expect(withoutUrl).not.toContain('https://example.com');
    });

    it('respects includeAccessDate option', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Test',
        accessedAt: '2024-01-15T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const withDate = citationManager.formatIEEE(citation, {
        includeAccessDate: true,
      });
      const withoutDate = citationManager.formatIEEE(citation, {
        includeAccessDate: false,
      });

      expect(withDate).toContain('[Accessed:');
      expect(withoutDate).not.toContain('[Accessed:');
    });
  });

  describe('formatAPA', () => {
    it('formats citation in APA style', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com/article',
        title: 'Understanding Modern APIs',
        authors: ['John Doe', 'Jane Smith'],
        date: 'January 2024',
        publisher: 'Tech Publisher',
        accessedAt: '2024-01-15T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatAPA(citation);

      expect(result).toContain('Doe, J.');
      expect(result).toContain('Smith, J.');
      expect(result).toContain('(2024).');
      expect(result).toContain('Understanding Modern APIs.');
      expect(result).toContain('Tech Publisher.');
      expect(result).toContain('https://example.com/article');
    });

    it('uses "n.d." when no date provided', () => {
      const citation: Citation = {
        id: 'test',
        number: 1,
        url: 'https://example.com',
        title: 'Undated Article',
        accessedAt: '2024-01-01T00:00:00.000Z',
        source: 'manual',
        usages: [],
      };

      const result = citationManager.formatAPA(citation);
      expect(result).toContain('(n.d.).');
    });
  });

  describe('formatTextWithCitations', () => {
    it('replaces markdown links with citation numbers', () => {
      const text = 'According to [this source](https://example.com/article)';
      const citations: Citation[] = [
        {
          id: 'test',
          number: 1,
          url: 'https://example.com/article',
          title: 'Test',
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'manual',
          usages: [],
        },
      ];

      const result = citationManager.formatTextWithCitations(text, citations);
      expect(result).toBe('According to this source [1]');
    });

    it('replaces bare URLs with citation numbers', () => {
      const text = 'See https://example.com/paper for more details';
      const citations: Citation[] = [
        {
          id: 'test',
          number: 3,
          url: 'https://example.com/paper',
          title: 'Paper',
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'manual',
          usages: [],
        },
      ];

      const result = citationManager.formatTextWithCitations(text, citations);
      expect(result).toBe('See [3] for more details');
    });

    it('handles multiple citations', () => {
      const text =
        'Source A: https://a.com, Source B: [link](https://b.com)';
      const citations: Citation[] = [
        {
          id: 'a',
          number: 1,
          url: 'https://a.com',
          title: 'A',
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'manual',
          usages: [],
        },
        {
          id: 'b',
          number: 2,
          url: 'https://b.com',
          title: 'B',
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'manual',
          usages: [],
        },
      ];

      const result = citationManager.formatTextWithCitations(text, citations);
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });
  });

  describe('hasCitations', () => {
    it('returns true when citation file exists', async () => {
      vi.mocked(fs.promises.access).mockResolvedValue();

      const result = await citationManager.hasCitations(testDocPath);
      expect(result).toBe(true);
    });

    it('returns false when citation file does not exist', async () => {
      vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));

      const result = await citationManager.hasCitations(testDocPath);
      expect(result).toBe(false);
    });
  });

  describe('getCitationCount', () => {
    it('returns count of citations', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: '1',
            number: 1,
            url: 'https://a.com',
            title: 'A',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
          {
            id: '2',
            number: 2,
            url: 'https://b.com',
            title: 'B',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 3,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.getCitationCount(testDocPath);
      expect(result).toBe(2);
    });
  });

  describe('getCitationByNumber', () => {
    it('returns citation when found', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'cit1',
            number: 1,
            url: 'https://example.com/a',
            title: 'Article A',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
          {
            id: 'cit2',
            number: 2,
            url: 'https://example.com/b',
            title: 'Article B',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 3,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.getCitationByNumber(testDocPath, 2);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('cit2');
      expect(result?.title).toBe('Article B');
    });

    it('returns null when not found', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.getCitationByNumber(testDocPath, 5);
      expect(result).toBeNull();
    });
  });

  describe('addUsage', () => {
    it('adds usage to existing citation', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'cit1',
            number: 1,
            url: 'https://example.com',
            title: 'Test',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 2,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );
      vi.mocked(fs.promises.writeFile).mockResolvedValue();

      const result = await citationManager.addUsage(testDocPath, 'cit1', {
        claim: 'Test claim',
        line: 42,
      });

      expect(result).toBe(true);
      const writtenContent = vi.mocked(fs.promises.writeFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent as string) as CitationFile;
      expect(parsed.citations[0].usages).toHaveLength(1);
      expect(parsed.citations[0].usages[0].claim).toBe('Test claim');
    });

    it('returns false for non-existent citation', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.addUsage(
        testDocPath,
        'nonexistent',
        { claim: 'Test' }
      );
      expect(result).toBe(false);
    });
  });

  describe('updateCitation', () => {
    it('updates citation fields', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'cit1',
            number: 1,
            url: 'https://old.com',
            title: 'Old Title',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 2,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );
      vi.mocked(fs.promises.writeFile).mockResolvedValue();

      const result = await citationManager.updateCitation(testDocPath, 'cit1', {
        url: 'https://new.com',
        title: 'New Title',
        authors: ['New Author'],
        date: '2024-06',
        publisher: 'New Publisher',
      });

      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://new.com');
      expect(result?.title).toBe('New Title');
      expect(result?.authors).toEqual(['New Author']);
    });

    it('returns null for non-existent citation', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.updateCitation(
        testDocPath,
        'nonexistent',
        { title: 'New' }
      );
      expect(result).toBeNull();
    });
  });

  describe('generateReferenceList', () => {
    const citationFile: CitationFile = {
      version: '1.0',
      documentPath: testDocPath,
      updatedAt: '2024-01-01T00:00:00.000Z',
      citations: [
        {
          id: 'cit1',
          number: 1,
          url: 'https://example.com/a',
          title: 'Article A',
          authors: ['John Doe'],
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'manual',
          usages: [],
        },
        {
          id: 'cit2',
          number: 2,
          url: 'https://example.com/b',
          title: 'Article B',
          date: '2024',
          accessedAt: '2024-01-01T00:00:00.000Z',
          source: 'perplexity',
          usages: [],
        },
      ],
      nextNumber: 3,
    };

    beforeEach(() => {
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );
    });

    it('generates IEEE reference list by default', async () => {
      const result = await citationManager.generateReferenceList(testDocPath);
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[0].text).toContain('[1]');
      expect(result[1].number).toBe(2);
      expect(result[1].text).toContain('[2]');
    });

    it('generates APA reference list', async () => {
      const result = await citationManager.generateReferenceList(testDocPath, {
        format: 'apa',
      });
      expect(result).toHaveLength(2);
      expect(result[0].text).toContain('Doe, J.');
      expect(result[1].text).toContain('(2024).');
    });

    it('respects includeUrls option', async () => {
      const withUrls = await citationManager.generateReferenceList(testDocPath, {
        format: 'ieee',
        includeUrls: true,
      });
      const withoutUrls = await citationManager.generateReferenceList(
        testDocPath,
        {
          format: 'ieee',
          includeUrls: false,
        }
      );

      expect(withUrls[0].url).toBe('https://example.com/a');
      expect(withoutUrls[0].url).toBeUndefined();
    });
  });

  describe('generateReferenceListMarkdown', () => {
    it('generates markdown with references heading', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'cit1',
            number: 1,
            url: 'https://example.com',
            title: 'Test Article',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 2,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.generateReferenceListMarkdown(
        testDocPath
      );
      expect(result).toContain('## References');
      expect(result).toContain('[1]');
      expect(result).toContain('Test Article');
    });

    it('returns empty string when no citations', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.generateReferenceListMarkdown(
        testDocPath
      );
      expect(result).toBe('');
    });
  });

  describe('removeCitation', () => {
    it('removes citation and renumbers remaining', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [
          {
            id: 'a',
            number: 1,
            url: 'https://a.com',
            title: 'A',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
          {
            id: 'b',
            number: 2,
            url: 'https://b.com',
            title: 'B',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
          {
            id: 'c',
            number: 3,
            url: 'https://c.com',
            title: 'C',
            accessedAt: '2024-01-01T00:00:00.000Z',
            source: 'manual',
            usages: [],
          },
        ],
        nextNumber: 4,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );
      vi.mocked(fs.promises.writeFile).mockResolvedValue();

      const result = await citationManager.removeCitation(testDocPath, 'b');
      expect(result).toBe(true);

      // Verify the written content has renumbered citations
      const writtenContent = vi.mocked(fs.promises.writeFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent as string) as CitationFile;
      expect(parsed.citations).toHaveLength(2);
      expect(parsed.citations[0].number).toBe(1);
      expect(parsed.citations[1].number).toBe(2);
      expect(parsed.nextNumber).toBe(3);
    });

    it('returns false when citation not found', async () => {
      const citationFile: CitationFile = {
        version: '1.0',
        documentPath: testDocPath,
        updatedAt: '2024-01-01T00:00:00.000Z',
        citations: [],
        nextNumber: 1,
      };

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(citationFile)
      );

      const result = await citationManager.removeCitation(
        testDocPath,
        'nonexistent'
      );
      expect(result).toBe(false);
    });
  });

  describe('deleteCitationFile', () => {
    it('deletes citation file and returns true', async () => {
      vi.mocked(fs.promises.unlink).mockResolvedValue();

      const result = await citationManager.deleteCitationFile(testDocPath);
      expect(result).toBe(true);
      expect(fs.promises.unlink).toHaveBeenCalledWith(expectedCitationPath);
    });

    it('returns false when file does not exist', async () => {
      vi.mocked(fs.promises.unlink).mockRejectedValue(new Error('ENOENT'));

      const result = await citationManager.deleteCitationFile(testDocPath);
      expect(result).toBe(false);
    });
  });
});
