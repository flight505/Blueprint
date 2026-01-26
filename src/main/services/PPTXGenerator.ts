import PptxGenJS from 'pptxgenjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { citationManager, type ReferenceListOptions } from './CitationManager';

/**
 * Theme colors for presentation
 */
export interface PPTXTheme {
  /** Primary color (headings, accents) */
  primary: string;
  /** Secondary color (subheadings) */
  secondary: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Accent color for highlights */
  accent: string;
}

/**
 * Predefined themes
 */
export const PPTX_THEMES: Record<string, PPTXTheme> = {
  default: {
    primary: '2D5A8B',    // Blue
    secondary: '4A7FB5',
    background: 'FFFFFF',
    text: '333333',
    accent: 'E67E22',
  },
  dark: {
    primary: '4FC3F7',    // Light blue on dark
    secondary: '81D4FA',
    background: '1E1E1E',
    text: 'FFFFFF',
    accent: 'FFB74D',
  },
  professional: {
    primary: '1A365D',    // Navy
    secondary: '2A4365',
    background: 'FFFFFF',
    text: '2D3748',
    accent: 'DD6B20',
  },
  modern: {
    primary: '6366F1',    // Indigo
    secondary: '8B5CF6',
    background: 'FFFFFF',
    text: '374151',
    accent: '10B981',
  },
  minimal: {
    primary: '000000',    // Black and white
    secondary: '4A4A4A',
    background: 'FFFFFF',
    text: '000000',
    accent: '888888',
  },
};

/**
 * Options for PPTX generation
 */
export interface PPTXGenerationOptions {
  /** Theme name or custom theme */
  theme?: string | PPTXTheme;
  /** Include title slide */
  includeTitleSlide?: boolean;
  /** Title slide metadata */
  titleSlide?: PPTXTitleSlideMetadata;
  /** Include citations/references slide */
  includeCitations?: boolean;
  /** Citation format */
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  /** Output directory (defaults to same as source) */
  outputDir?: string;
  /** Custom output filename (without extension) */
  outputFilename?: string;
  /** Presentation metadata */
  metadata?: PPTXMetadata;
  /** Slide size (16:9 or 4:3) */
  slideSize?: '16:9' | '4:3';
  /** Maximum bullets per slide before splitting */
  maxBulletsPerSlide?: number;
}

/**
 * Title slide metadata
 */
export interface PPTXTitleSlideMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

/**
 * Presentation metadata
 */
export interface PPTXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  company?: string;
  keywords?: string[];
}

/**
 * Result of PPTX generation
 */
export interface PPTXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  slideCount?: number;
}

/**
 * Section to include in the PPTX
 */
export interface PPTXSection {
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
 * Slide content structure
 */
interface SlideContent {
  type: 'section' | 'content' | 'title' | 'table' | 'code';
  title: string;
  subtitle?: string;
  bullets?: string[];
  tableData?: string[][];
  codeContent?: string;
  codeLanguage?: string;
}

/**
 * PPTXGenerator service handles PowerPoint presentation creation.
 * H1 headings become section dividers, H2 headings become content slides.
 */
class PPTXGenerator {
  private defaultTheme: PPTXTheme = PPTX_THEMES.default;
  private maxBulletsPerSlide = 6;

  /**
   * Get theme by name or return custom theme
   */
  private getTheme(themeOption?: string | PPTXTheme): PPTXTheme {
    if (!themeOption) return this.defaultTheme;
    if (typeof themeOption === 'string') {
      return PPTX_THEMES[themeOption] || this.defaultTheme;
    }
    return themeOption;
  }

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
   * Strip inline markdown formatting
   */
  private stripFormatting(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold
      .replace(/__(.+?)__/g, '$1')       // Bold
      .replace(/\*(.+?)\*/g, '$1')       // Italic
      .replace(/_(.+?)_/g, '$1')         // Italic
      .replace(/`(.+?)`/g, '$1')         // Code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
  }

  /**
   * Convert parsed elements to slide content
   */
  private elementsToSlides(elements: ParsedElement[], maxBullets: number): SlideContent[] {
    const slides: SlideContent[] = [];
    let currentSlide: SlideContent | null = null;
    let pendingBullets: string[] = [];

    const flushBullets = () => {
      if (pendingBullets.length > 0 && currentSlide) {
        // Split into multiple slides if needed
        while (pendingBullets.length > 0) {
          const chunk = pendingBullets.splice(0, maxBullets);
          if (!currentSlide.bullets) {
            currentSlide.bullets = chunk;
          } else {
            // Create continuation slide
            slides.push({ ...currentSlide });
            currentSlide = {
              type: 'content',
              title: currentSlide.title + ' (continued)',
              bullets: chunk,
            };
          }
        }
      }
    };

    for (const element of elements) {
      switch (element.type) {
        case 'heading':
          // Flush pending content
          flushBullets();
          if (currentSlide) {
            slides.push(currentSlide);
          }

          if (element.level === 1) {
            // H1 = Section divider slide
            currentSlide = {
              type: 'section',
              title: this.stripFormatting(element.content || ''),
            };
          } else {
            // H2+ = Content slide
            currentSlide = {
              type: 'content',
              title: this.stripFormatting(element.content || ''),
              bullets: [],
            };
          }
          break;

        case 'paragraph':
          if (currentSlide && element.content) {
            pendingBullets.push(this.stripFormatting(element.content));
          }
          break;

        case 'list':
          if (currentSlide && element.items) {
            for (const item of element.items) {
              pendingBullets.push(this.stripFormatting(item));
            }
          }
          break;

        case 'table':
          // Flush current bullets
          flushBullets();
          if (currentSlide) {
            slides.push(currentSlide);
          }
          // Create table slide
          currentSlide = {
            type: 'table',
            title: 'Data',
            tableData: element.rows,
          };
          slides.push(currentSlide);
          currentSlide = null;
          break;

        case 'code':
          // Flush current bullets
          flushBullets();
          if (currentSlide) {
            slides.push(currentSlide);
          }
          // Create code slide
          currentSlide = {
            type: 'code',
            title: element.language ? `Code: ${element.language}` : 'Code',
            codeContent: element.content,
            codeLanguage: element.language,
          };
          slides.push(currentSlide);
          currentSlide = null;
          break;

        case 'blockquote':
          if (currentSlide && element.content) {
            pendingBullets.push(`"${this.stripFormatting(element.content)}"`);
          }
          break;

        case 'hr':
          // Horizontal rules are ignored in presentations
          break;
      }
    }

    // Flush remaining content
    flushBullets();
    if (currentSlide) {
      slides.push(currentSlide);
    }

    return slides;
  }

  /**
   * Add title slide
   */
  private addTitleSlide(pptx: PptxGenJS, metadata: PPTXTitleSlideMetadata, theme: PPTXTheme): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText(metadata.title, {
      x: 0.5,
      y: 2.0,
      w: '90%',
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: theme.primary,
      align: 'center',
    });

    // Subtitle
    if (metadata.subtitle) {
      slide.addText(metadata.subtitle, {
        x: 0.5,
        y: 3.5,
        w: '90%',
        h: 0.75,
        fontSize: 24,
        color: theme.secondary,
        align: 'center',
      });
    }

    // Author and organization
    const footerParts: string[] = [];
    if (metadata.author) footerParts.push(metadata.author);
    if (metadata.organization) footerParts.push(metadata.organization);

    if (footerParts.length > 0) {
      slide.addText(footerParts.join(' | '), {
        x: 0.5,
        y: 4.75,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: theme.text,
        align: 'center',
      });
    }

    // Date
    const date = metadata.date || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    slide.addText(date, {
      x: 0.5,
      y: 5.25,
      w: '90%',
      h: 0.5,
      fontSize: 14,
      color: theme.secondary,
      align: 'center',
    });
  }

  /**
   * Add section divider slide
   */
  private addSectionSlide(pptx: PptxGenJS, content: SlideContent, theme: PPTXTheme): void {
    const slide = pptx.addSlide();

    // Add colored background accent
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 2.0,
      w: '100%',
      h: 1.5,
      fill: { color: theme.primary },
    });

    // Section title
    slide.addText(content.title, {
      x: 0.5,
      y: 2.25,
      w: '90%',
      h: 1.0,
      fontSize: 36,
      bold: true,
      color: theme.background,
      align: 'center',
    });
  }

  /**
   * Add content slide with bullets
   */
  private addContentSlide(pptx: PptxGenJS, content: SlideContent, theme: PPTXTheme): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText(content.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.75,
      fontSize: 28,
      bold: true,
      color: theme.primary,
    });

    // Underline
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 1.0,
      w: 9,
      h: 0,
      line: { color: theme.accent, width: 2 },
    });

    // Bullets
    if (content.bullets && content.bullets.length > 0) {
      const bulletPoints = content.bullets.map(bullet => ({
        text: bullet,
        options: { bullet: { type: 'bullet' as const }, color: theme.text },
      }));

      slide.addText(bulletPoints, {
        x: 0.5,
        y: 1.25,
        w: 9,
        h: 4.0,
        fontSize: 18,
        color: theme.text,
        valign: 'top',
      });
    }
  }

  /**
   * Add table slide
   */
  private addTableSlide(pptx: PptxGenJS, content: SlideContent, theme: PPTXTheme): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText(content.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.75,
      fontSize: 28,
      bold: true,
      color: theme.primary,
    });

    if (content.tableData && content.tableData.length > 0) {
      const tableRows: PptxGenJS.TableRow[] = content.tableData.map((row, rowIdx) =>
        row.map(cell => ({
          text: cell,
          options: {
            fill: { color: rowIdx === 0 ? theme.primary : theme.background },
            color: rowIdx === 0 ? theme.background : theme.text,
            bold: rowIdx === 0,
            fontSize: 14,
            align: 'center' as const,
            valign: 'middle' as const,
          },
        }))
      );

      slide.addTable(tableRows, {
        x: 0.5,
        y: 1.25,
        w: 9,
        h: 4.0,
        border: { color: theme.secondary, pt: 1 },
        colW: Array(content.tableData[0]?.length || 1).fill(9 / (content.tableData[0]?.length || 1)),
      });
    }
  }

  /**
   * Add code slide
   */
  private addCodeSlide(pptx: PptxGenJS, content: SlideContent, theme: PPTXTheme): void {
    const slide = pptx.addSlide();

    // Title
    slide.addText(content.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.75,
      fontSize: 28,
      bold: true,
      color: theme.primary,
    });

    // Code block background
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 9,
      h: 4.2,
      fill: { color: 'F5F5F5' },
    });

    // Code content
    if (content.codeContent) {
      slide.addText(content.codeContent, {
        x: 0.6,
        y: 1.2,
        w: 8.8,
        h: 4.0,
        fontSize: 12,
        fontFace: 'Consolas',
        color: '333333',
        valign: 'top',
      });
    }
  }

  /**
   * Generate PPTX from markdown content
   */
  async generatePPTX(
    markdownContent: string,
    outputPath: string,
    options: PPTXGenerationOptions = {}
  ): Promise<PPTXGenerationResult> {
    try {
      const theme = this.getTheme(options.theme);
      const maxBullets = options.maxBulletsPerSlide || this.maxBulletsPerSlide;

      // Create presentation
      const pptx = new PptxGenJS();

      // Set presentation properties
      if (options.metadata) {
        if (options.metadata.title) pptx.title = options.metadata.title;
        if (options.metadata.author) pptx.author = options.metadata.author;
        if (options.metadata.subject) pptx.subject = options.metadata.subject;
        if (options.metadata.company) pptx.company = options.metadata.company;
      }

      // Set slide size
      if (options.slideSize === '4:3') {
        pptx.defineLayout({ name: 'LAYOUT_4x3', width: 10, height: 7.5 });
        pptx.layout = 'LAYOUT_4x3';
      } else {
        // Default 16:9
        pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
        pptx.layout = 'LAYOUT_16x9';
      }

      // Add title slide if requested
      if (options.includeTitleSlide && options.titleSlide) {
        this.addTitleSlide(pptx, options.titleSlide, theme);
      }

      // Parse markdown and generate slides
      const elements = this.parseMarkdown(markdownContent);
      const slideContents = this.elementsToSlides(elements, maxBullets);

      for (const content of slideContents) {
        switch (content.type) {
          case 'section':
            this.addSectionSlide(pptx, content, theme);
            break;
          case 'content':
            this.addContentSlide(pptx, content, theme);
            break;
          case 'table':
            this.addTableSlide(pptx, content, theme);
            break;
          case 'code':
            this.addCodeSlide(pptx, content, theme);
            break;
        }
      }

      // Track slide count before writing
      let slideCount = 0;

      // Count slides created
      if (options.includeTitleSlide && options.titleSlide) {
        slideCount++;
      }
      slideCount += slideContents.length;

      // Write to file
      await pptx.writeFile({ fileName: outputPath });

      return {
        success: true,
        outputPath,
        slideCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PPTX generation',
      };
    }
  }

  /**
   * Generate PPTX from a document file with citations
   */
  async generatePPTXFromDocument(
    documentPath: string,
    options: PPTXGenerationOptions = {}
  ): Promise<PPTXGenerationResult> {
    try {
      // Read the document
      const content = await fs.promises.readFile(documentPath, 'utf-8');

      // Determine output path
      const dir = options.outputDir || path.dirname(documentPath);
      const baseName = options.outputFilename || path.basename(documentPath, path.extname(documentPath));
      const outputPath = path.join(dir, `${baseName}.pptx`);

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
          fullContent += '\n\n# References\n\n' + referenceList;
        }
      }

      // Set title slide defaults from document if not provided
      if (options.includeTitleSlide && !options.titleSlide) {
        // Extract title from first heading
        const titleMatch = fullContent.match(/^#\s+(.+)$/m);
        options.titleSlide = {
          title: titleMatch ? titleMatch[1] : path.basename(documentPath, path.extname(documentPath)),
        };
      }

      return await this.generatePPTX(fullContent, outputPath, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read document',
      };
    }
  }

  /**
   * Generate PPTX from multiple sections
   */
  async generatePPTXFromSections(
    sections: PPTXSection[],
    outputPath: string,
    options: PPTXGenerationOptions = {}
  ): Promise<PPTXGenerationResult> {
    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Build combined content with H1 headers for each section
    const content = sortedSections
      .map(section => `# ${section.title}\n\n${section.content}`)
      .join('\n\n');

    return await this.generatePPTX(content, outputPath, options);
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): string[] {
    return Object.keys(PPTX_THEMES);
  }
}

// Export singleton instance
export const pptxGenerator = new PPTXGenerator();
