import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { citationManager, type ReferenceListOptions } from './CitationManager';

/**
 * Options for DOCX generation
 */
export interface DOCXGenerationOptions {
  /** Include table of contents */
  includeToc?: boolean;
  /** Include cover page with project metadata */
  includeCoverPage?: boolean;
  /** Cover page metadata */
  coverPage?: DOCXCoverPageMetadata;
  /** Include citations/references section */
  includeCitations?: boolean;
  /** Citation format (IEEE, APA, etc.) */
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  /** Output directory (defaults to same as source) */
  outputDir?: string;
  /** Custom output filename (without extension) */
  outputFilename?: string;
  /** Document metadata */
  documentMetadata?: DOCXMetadata;
  /** Font family for body text */
  fontFamily?: string;
  /** Font size in points */
  fontSize?: number;
  /** Page size */
  pageSize?: 'a4' | 'letter' | 'legal';
}

/**
 * Cover page metadata
 */
export interface DOCXCoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

/**
 * Document metadata for document properties
 */
export interface DOCXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
}

/**
 * Result of DOCX generation
 */
export interface DOCXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Section to include in the DOCX
 */
export interface DOCXSection {
  title: string;
  content: string;
  order: number;
}

/**
 * Parsed markdown element
 */
interface ParsedElement {
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'blockquote' | 'hr';
  level?: number;
  content?: string;
  items?: string[];
  ordered?: boolean;
  rows?: string[][];
  language?: string;
}

/**
 * DOCXGenerator service handles Word document creation.
 * Supports headings, lists, tables, and code blocks with proper formatting.
 */
class DOCXGenerator {
  private defaultFontFamily = 'Calibri';
  private monospaceFontFamily = 'Consolas';
  private defaultFontSize = 22; // Half-points (11pt)

  /**
   * Parse markdown content into elements
   */
  private parseMarkdown(content: string): ParsedElement[] {
    const elements: ParsedElement[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(---|\*\*\*|___)$/.test(trimmedLine)) {
        elements.push({ type: 'hr' });
        i++;
        continue;
      }

      // Headings
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        elements.push({
          type: 'heading',
          level: headingMatch[1].length,
          content: headingMatch[2],
        });
        i++;
        continue;
      }

      // Code blocks
      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push({
          type: 'code',
          content: codeLines.join('\n'),
          language,
        });
        i++;
        continue;
      }

      // Unordered lists
      if (/^[-*+]\s+/.test(trimmedLine)) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
          i++;
        }
        elements.push({
          type: 'list',
          items: listItems,
          ordered: false,
        });
        continue;
      }

      // Ordered lists
      if (/^\d+\.\s+/.test(trimmedLine)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        elements.push({
          type: 'list',
          items: listItems,
          ordered: true,
        });
        continue;
      }

      // Tables
      if (trimmedLine.includes('|')) {
        const tableRows: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          const row = lines[i]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
          // Skip separator rows
          if (!row.every(cell => /^[-:]+$/.test(cell))) {
            tableRows.push(row);
          }
          i++;
        }
        if (tableRows.length > 0) {
          elements.push({
            type: 'table',
            rows: tableRows,
          });
        }
        continue;
      }

      // Blockquotes
      if (trimmedLine.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
          i++;
        }
        elements.push({
          type: 'blockquote',
          content: quoteLines.join('\n'),
        });
        continue;
      }

      // Regular paragraphs
      const paragraphLines: string[] = [trimmedLine];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('>') &&
        !/^[-*+]\s+/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i].trim()) &&
        !lines[i].includes('|') &&
        !/^(---|\*\*\*|___)$/.test(lines[i].trim())
      ) {
        paragraphLines.push(lines[i].trim());
        i++;
      }
      elements.push({
        type: 'paragraph',
        content: paragraphLines.join(' '),
      });
    }

    return elements;
  }

  /**
   * Parse inline markdown formatting
   */
  private parseInlineFormatting(text: string, isCode = false): TextRun[] {
    const runs: TextRun[] = [];

    if (isCode) {
      return [
        new TextRun({
          text,
          font: this.monospaceFontFamily,
          size: 20, // 10pt
        }),
      ];
    }

    // Parse inline formatting: **bold**, *italic*, `code`, [link](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const currentText = text;

    // First pass: extract links
    const links: { match: string; text: string; url: string; index: number }[] = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(currentText)) !== null) {
      links.push({
        match: linkMatch[0],
        text: linkMatch[1],
        url: linkMatch[2],
        index: linkMatch.index,
      });
    }

    // Replace links with placeholders and track them
    let processedText = currentText;
    for (let i = links.length - 1; i >= 0; i--) {
      const link = links[i];
      processedText =
        processedText.slice(0, link.index) +
        `\x00LINK${i}\x00` +
        processedText.slice(link.index + link.match.length);
    }

    // Split text into segments
    const segments = this.splitByFormatting(processedText);

    for (const segment of segments) {
      // Check if this is a link placeholder
      const linkPlaceholder = segment.text.match(/\x00LINK(\d+)\x00/);
      if (linkPlaceholder) {
        const linkIndex = parseInt(linkPlaceholder[1], 10);
        const link = links[linkIndex];
        runs.push(
          new TextRun({
            text: link.text,
            style: 'Hyperlink',
            color: '0563C1',
            underline: {},
          })
        );
      } else if (segment.code) {
        runs.push(
          new TextRun({
            text: segment.text,
            font: this.monospaceFontFamily,
            size: 20,
            shading: { fill: 'F5F5F5' },
          })
        );
      } else if (segment.bold && segment.italic) {
        runs.push(
          new TextRun({
            text: segment.text,
            bold: true,
            italics: true,
          })
        );
      } else if (segment.bold) {
        runs.push(
          new TextRun({
            text: segment.text,
            bold: true,
          })
        );
      } else if (segment.italic) {
        runs.push(
          new TextRun({
            text: segment.text,
            italics: true,
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: segment.text,
          })
        );
      }
    }

    return runs.length > 0 ? runs : [new TextRun({ text })];
  }

  /**
   * Split text by formatting markers
   */
  private splitByFormatting(text: string): { text: string; bold?: boolean; italic?: boolean; code?: boolean }[] {
    const segments: { text: string; bold?: boolean; italic?: boolean; code?: boolean }[] = [];
    let remaining = text;

    // Process text character by character, tracking state
    let current = '';
    let i = 0;

    while (i < remaining.length) {
      // Inline code
      if (remaining[i] === '`') {
        if (current) {
          segments.push({ text: current });
          current = '';
        }
        const end = remaining.indexOf('`', i + 1);
        if (end !== -1) {
          segments.push({ text: remaining.slice(i + 1, end), code: true });
          i = end + 1;
          continue;
        }
      }

      // Bold (**text**)
      if (remaining.slice(i, i + 2) === '**') {
        if (current) {
          segments.push({ text: current });
          current = '';
        }
        const end = remaining.indexOf('**', i + 2);
        if (end !== -1) {
          segments.push({ text: remaining.slice(i + 2, end), bold: true });
          i = end + 2;
          continue;
        }
      }

      // Bold (__text__)
      if (remaining.slice(i, i + 2) === '__') {
        if (current) {
          segments.push({ text: current });
          current = '';
        }
        const end = remaining.indexOf('__', i + 2);
        if (end !== -1) {
          segments.push({ text: remaining.slice(i + 2, end), bold: true });
          i = end + 2;
          continue;
        }
      }

      // Italic (*text*)
      if (remaining[i] === '*' && remaining[i + 1] !== '*') {
        if (current) {
          segments.push({ text: current });
          current = '';
        }
        const end = remaining.indexOf('*', i + 1);
        if (end !== -1 && remaining[end - 1] !== '*') {
          segments.push({ text: remaining.slice(i + 1, end), italic: true });
          i = end + 1;
          continue;
        }
      }

      // Italic (_text_)
      if (remaining[i] === '_' && remaining[i + 1] !== '_') {
        if (current) {
          segments.push({ text: current });
          current = '';
        }
        const end = remaining.indexOf('_', i + 1);
        if (end !== -1 && remaining[end - 1] !== '_') {
          segments.push({ text: remaining.slice(i + 1, end), italic: true });
          i = end + 1;
          continue;
        }
      }

      current += remaining[i];
      i++;
    }

    if (current) {
      segments.push({ text: current });
    }

    return segments;
  }

  /**
   * Convert parsed element to docx paragraphs
   */
  private elementToParagraphs(element: ParsedElement): (Paragraph | Table)[] {
    switch (element.type) {
      case 'heading':
        return [this.createHeading(element.content || '', element.level || 1)];

      case 'paragraph':
        return [this.createParagraph(element.content || '')];

      case 'code':
        return this.createCodeBlock(element.content || '', element.language);

      case 'list':
        return this.createList(element.items || [], element.ordered || false);

      case 'table':
        return [this.createTable(element.rows || [])];

      case 'blockquote':
        return [this.createBlockquote(element.content || '')];

      case 'hr':
        return [this.createHorizontalRule()];

      default:
        return [];
    }
  }

  /**
   * Create a heading paragraph
   */
  private createHeading(text: string, level: number): Paragraph {
    const headingLevel = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    }[level] || HeadingLevel.HEADING_1;

    return new Paragraph({
      heading: headingLevel,
      children: this.parseInlineFormatting(text),
      spacing: { before: 240, after: 120 },
    });
  }

  /**
   * Create a regular paragraph
   */
  private createParagraph(text: string): Paragraph {
    return new Paragraph({
      children: this.parseInlineFormatting(text),
      spacing: { after: 120 },
    });
  }

  /**
   * Create a code block
   */
  private createCodeBlock(code: string, language?: string): Paragraph[] {
    const lines = code.split('\n');
    const paragraphs: Paragraph[] = [];

    // Add language label if provided
    if (language) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: language,
              font: this.monospaceFontFamily,
              size: 18,
              color: '666666',
            }),
          ],
          spacing: { before: 120, after: 60 },
        })
      );
    }

    // Add code lines
    for (const line of lines) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line || ' ', // Ensure empty lines have content
              font: this.monospaceFontFamily,
              size: 20,
            }),
          ],
          shading: { fill: 'F5F5F5' },
          spacing: { before: 0, after: 0, line: 276 },
          indent: { left: 360 },
        })
      );
    }

    // Add spacing after code block
    paragraphs.push(
      new Paragraph({
        spacing: { before: 0, after: 120 },
      })
    );

    return paragraphs;
  }

  /**
   * Create a list
   */
  private createList(items: string[], ordered: boolean): Paragraph[] {
    return items.map(
      (item, index) =>
        new Paragraph({
          children: [
            new TextRun({
              text: ordered ? `${index + 1}. ` : '• ',
            }),
            ...this.parseInlineFormatting(item),
          ],
          indent: { left: 720 },
          spacing: { after: 60 },
        })
    );
  }

  /**
   * Create a table
   */
  private createTable(rows: string[][]): Table {
    if (rows.length === 0) {
      return new Table({ rows: [] });
    }

    const columnCount = Math.max(...rows.map(row => row.length));

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map((row, rowIndex) =>
        new TableRow({
          children: row.map(
            cell =>
              new TableCell({
                width: { size: 100 / columnCount, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: this.parseInlineFormatting(cell),
                  }),
                ],
                shading: rowIndex === 0 ? { fill: 'E0E0E0' } : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                },
              })
          ),
        })
      ),
    });
  }

  /**
   * Create a blockquote
   */
  private createBlockquote(text: string): Paragraph {
    return new Paragraph({
      children: this.parseInlineFormatting(text),
      indent: { left: 720 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' },
      },
      spacing: { before: 120, after: 120 },
    });
  }

  /**
   * Create a horizontal rule
   */
  private createHorizontalRule(): Paragraph {
    return new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      },
      spacing: { before: 240, after: 240 },
    });
  }

  /**
   * Generate cover page content
   */
  private generateCoverPage(metadata: DOCXCoverPageMetadata): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Add spacing at top
    paragraphs.push(
      new Paragraph({
        spacing: { before: 2880 }, // ~2 inches
      })
    );

    // Title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metadata.title,
            bold: true,
            size: 72, // 36pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    );

    // Subtitle
    if (metadata.subtitle) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.subtitle,
              size: 40, // 20pt
              color: '666666',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 960 },
        })
      );
    }

    // Author
    if (metadata.author) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Author: ${metadata.author}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
    }

    // Organization
    if (metadata.organization) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.organization,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
    }

    // Date
    const date = metadata.date || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: date,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );

    // Page break after cover
    paragraphs.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    return paragraphs;
  }

  /**
   * Generate DOCX from markdown content
   */
  async generateDOCX(
    markdownContent: string,
    outputPath: string,
    options: DOCXGenerationOptions = {}
  ): Promise<DOCXGenerationResult> {
    try {
      const sections: (Paragraph | Table)[] = [];

      // Add cover page if requested
      if (options.includeCoverPage && options.coverPage) {
        sections.push(...this.generateCoverPage(options.coverPage));
      }

      // Parse and convert markdown content
      const elements = this.parseMarkdown(markdownContent);
      for (const element of elements) {
        sections.push(...this.elementToParagraphs(element));
      }

      // Create document
      const doc = new Document({
        creator: options.documentMetadata?.creator || 'Blueprint',
        title: options.documentMetadata?.title,
        subject: options.documentMetadata?.subject,
        description: options.documentMetadata?.description,
        keywords: options.documentMetadata?.keywords?.join(', '),
        sections: [
          {
            children: sections,
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: [PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                        size: 18,
                        color: '999999',
                      }),
                    ],
                  }),
                ],
              }),
            },
          },
        ],
        numbering: {
          config: [
            {
              reference: 'numbered-list',
              levels: [
                {
                  level: 0,
                  format: NumberFormat.DECIMAL,
                  text: '%1.',
                  alignment: AlignmentType.LEFT,
                },
              ],
            },
          ],
        },
        styles: {
          paragraphStyles: [
            {
              id: 'Normal',
              name: 'Normal',
              run: {
                font: options.fontFamily || this.defaultFontFamily,
                size: options.fontSize ? options.fontSize * 2 : this.defaultFontSize,
              },
            },
          ],
        },
      });

      // Generate buffer and write file
      const buffer = await Packer.toBuffer(doc);
      await fs.promises.writeFile(outputPath, buffer);

      return {
        success: true,
        outputPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during DOCX generation',
      };
    }
  }

  /**
   * Generate DOCX from a document file with citations
   */
  async generateDOCXFromDocument(
    documentPath: string,
    options: DOCXGenerationOptions = {}
  ): Promise<DOCXGenerationResult> {
    try {
      // Read the document
      const content = await fs.promises.readFile(documentPath, 'utf-8');

      // Determine output path
      const dir = options.outputDir || path.dirname(documentPath);
      const baseName = options.outputFilename || path.basename(documentPath, path.extname(documentPath));
      const outputPath = path.join(dir, `${baseName}.docx`);

      // Build full content with citations if requested
      let fullContent = content;

      if (options.includeCitations) {
        const citationFormat = options.citationFormat || 'ieee';
        const referenceListOptions: ReferenceListOptions = {
          format: citationFormat,
          includeUrls: true,
          includeAccessDates: true,
        };

        const referenceList = await citationManager.generateReferenceListMarkdown(
          documentPath,
          referenceListOptions
        );

        if (referenceList) {
          fullContent += '\n\n---\n\n' + referenceList;
        }
      }

      // Set cover page defaults from document if not provided
      if (options.includeCoverPage && !options.coverPage) {
        // Extract title from first heading
        const titleMatch = fullContent.match(/^#\s+(.+)$/m);
        options.coverPage = {
          title: titleMatch ? titleMatch[1] : path.basename(documentPath, path.extname(documentPath)),
        };
      }

      return await this.generateDOCX(fullContent, outputPath, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read document',
      };
    }
  }

  /**
   * Generate DOCX from multiple sections
   */
  async generateDOCXFromSections(
    sections: DOCXSection[],
    outputPath: string,
    options: DOCXGenerationOptions = {}
  ): Promise<DOCXGenerationResult> {
    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Build combined content
    const content = sortedSections
      .map(section => `# ${section.title}\n\n${section.content}`)
      .join('\n\n---\n\n');

    return await this.generateDOCX(content, outputPath, options);
  }
}

// Export singleton instance
export const docxGenerator = new DOCXGenerator();
