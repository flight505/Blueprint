/**
 * Centralized Icon Components
 *
 * Uses Lucide React icons throughout the app for a professional look.
 * All icons are exported from here to maintain consistency.
 */

import {
  MessageSquare,
  FolderOpen,
  Folder,
  Search,
  BarChart3,
  ClipboardList,
  Download,
  Clock,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  FileText,
  FileCode,
  FileJson,
  FileCog,
  Image,
  Globe,
  Target,
  Palette,
  BookOpen,
  Presentation,
  PenLine,
  Zap,
  Scale,
  Microscope,
  AlertTriangle,
  Check,
  X,
  Lock,
  Sparkles,
  Copy,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  Square,
  CircleCheck,
  CircleAlert,
  CircleX,
  Circle,
  Building2,
  Cog,
  Layers,
  Loader2,
  Upload,
  Wand2,
  RotateCcw,
  Send,
  ImagePlus,
  History,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

// Re-export commonly used icons
export {
  MessageSquare,
  FolderOpen,
  Folder,
  Search,
  BarChart3,
  ClipboardList,
  Download,
  Clock,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
  FileText,
  FileCode,
  FileJson,
  FileCog,
  Image,
  Globe,
  Target,
  Palette,
  BookOpen,
  Presentation,
  PenLine,
  Zap,
  Scale,
  Microscope,
  AlertTriangle,
  Check,
  X,
  Lock,
  Sparkles,
  Copy,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  Square,
  CircleCheck,
  CircleAlert,
  CircleX,
  Circle,
  Building2,
  Cog,
  Layers,
  Loader2,
  Upload,
  Wand2,
  RotateCcw,
  Send,
  ImagePlus,
  History,
};

// Icon size presets
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// Navigation section icons
export const NAV_ICONS = {
  chat: MessageSquare,
  explorer: FolderOpen,
  search: Search,
  context: BarChart3,
  planning: ClipboardList,
  image: ImagePlus,
  export: Download,
  history: Clock,
  settings: Settings,
  help: HelpCircle,
} as const;

// Theme icons
export const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

// File type icon mapping
const FILE_ICON_MAP: Record<string, LucideIcon> = {
  // Documents
  md: FileText,
  mdx: FileText,
  markdown: FileText,
  txt: FileText,

  // Code
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  py: FileCode,

  // Config
  json: FileJson,
  yaml: FileCog,
  yml: FileCog,

  // Styles
  css: Palette,
  scss: Palette,

  // Web
  html: Globe,
  svg: Target,

  // Images
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,

  // Documents
  pdf: BookOpen,
};

/**
 * Get the appropriate icon component for a file type
 */
export function getFileIcon(filename: string, isDirectory: boolean): LucideIcon {
  if (isDirectory) return Folder;

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICON_MAP[ext] || FileText;
}

/**
 * Render a file icon as a React element
 */
export function FileIcon({
  filename,
  isDirectory = false,
  size = 'md',
  className = '',
}: {
  filename: string;
  isDirectory?: boolean;
  size?: IconSize;
  className?: string;
}): ReactNode {
  const IconComponent = getFileIcon(filename, isDirectory);
  return <IconComponent size={ICON_SIZES[size]} className={className} />;
}

// Export format icons
export const EXPORT_ICONS = {
  pdf: BookOpen,
  docx: FileText,
  pptx: Presentation,
} as const;

// Research mode icons
export const RESEARCH_ICONS = {
  quick: Zap,
  balanced: Scale,
  comprehensive: Microscope,
} as const;

// Phase icons for planning
export const PHASE_ICONS = {
  market_research: BarChart3,
  competitive_analysis: Search,
  technical_feasibility: Cog,
  architecture_design: Building2,
  risk_assessment: AlertTriangle,
  sprint_planning: ClipboardList,
  general: PenLine,
} as const;

// Status icons
export const STATUS_ICONS = {
  success: Check,
  warning: AlertTriangle,
  error: X,
  info: HelpCircle,
} as const;

// Confidence level icons
export const CONFIDENCE_ICONS = {
  high: CircleCheck,
  medium: CircleAlert,
  low: CircleX,
} as const;
