import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from '@storybook/test';
import {
  GlassSidebar,
  GlassSidebarRail,
  GlassSidebarPanel,
  GlassSidebarSection,
  GlassSidebarItem,
  GlassSidebarBrand,
  type NavItem,
} from './index';
import { NAV_ICONS, Folder, FileText, Palette } from '../icons';

// Sample navigation items matching Blueprint's sections
const blueprintNavItems: NavItem[] = [
  { id: 'chat', icon: <NAV_ICONS.chat size={18} />, label: 'Chat', shortcut: '⌘1' },
  { id: 'explorer', icon: <NAV_ICONS.explorer size={18} />, label: 'Explorer', shortcut: '⌘2' },
  { id: 'search', icon: <NAV_ICONS.search size={18} />, label: 'Search', shortcut: '⌘3' },
  { id: 'context', icon: <NAV_ICONS.context size={18} />, label: 'Context', shortcut: '⌘4' },
  { id: 'planning', icon: <NAV_ICONS.planning size={18} />, label: 'Planning', shortcut: '⌘5', badge: 3 },
  { id: 'export', icon: <NAV_ICONS.export size={18} />, label: 'Export', shortcut: '⌘6' },
  { id: 'history', icon: <NAV_ICONS.history size={18} />, label: 'History', shortcut: '⌘7' },
];

const utilityNavItems: NavItem[] = [
  { id: 'settings', icon: <NAV_ICONS.settings size={18} />, label: 'Settings', shortcut: '⌘,' },
  { id: 'help', icon: <NAV_ICONS.help size={18} />, label: 'Help', shortcut: '⌘?' },
];

/**
 * Glass Sidebar - A unified sidebar system for desktop apps.
 *
 * ## Features
 * - Three modes: Collapsed, Expanded, Inline
 * - Glass visual treatment with backdrop blur
 * - Active state with violet glow
 * - Badge support for notifications
 * - Keyboard shortcut hints
 *
 * ## Usage
 * ```tsx
 * <GlassSidebar
 *   mode="expanded"
 *   items={navItems}
 *   activeId={activeSection}
 *   onItemSelect={setActiveSection}
 *   panelContent={<FileBrowser />}
 * />
 * ```
 */
const meta = {
  title: 'Components/Navigation/GlassSidebar',
  component: GlassSidebar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'tokyo-night-storm' },
  },
  tags: ['autodocs'],
  args: {
    onItemSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-900 flex">
        <Story />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Main Content Area
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof GlassSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Mode Variations
// ============================================================================

/**
 * Expanded mode with Rail + Panel - the standard desktop layout for Blueprint.
 */
export const ExpandedMode: Story = {
  args: {
    mode: 'expanded',
    items: blueprintNavItems,
    utilityItems: utilityNavItems,
    activeId: 'explorer',
    panelTitle: 'Explorer',
    panelContent: (
      <div className="p-4 text-sm text-gray-400">
        <p className="mb-2">File tree would go here</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 p-1 hover:bg-white/5 rounded">
            <Folder size={14} /> src
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-white/5 rounded pl-4">
            <Folder size={14} /> components
          </div>
          <div className="flex items-center gap-2 p-1 hover:bg-white/5 rounded pl-6">
            <FileText size={14} /> App.tsx
          </div>
        </div>
      </div>
    ),
    version: '1.0.0',
  },
};

/**
 * Collapsed mode - Rail only, maximum content space.
 */
export const CollapsedMode: Story = {
  args: {
    mode: 'collapsed',
    items: blueprintNavItems,
    utilityItems: utilityNavItems,
    activeId: 'chat',
    version: '1.0.0',
  },
};

/**
 * Inline mode - Single column with icons + labels, for simpler apps.
 */
export const InlineMode: Story = {
  args: {
    mode: 'inline',
    items: blueprintNavItems,
    utilityItems: utilityNavItems,
    activeId: 'planning',
    version: '1.0.0',
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive sidebar with state management.
 */
export const Interactive: StoryObj = {
  render: function InteractiveSidebar() {
    const [activeId, setActiveId] = useState('chat');
    const [mode, setMode] = useState<'collapsed' | 'expanded' | 'inline'>('expanded');

    const panelContent: Record<string, React.ReactNode> = {
      chat: (
        <div className="p-4 text-sm text-gray-400">
          <p>Chat history panel</p>
        </div>
      ),
      explorer: (
        <div className="p-4 text-sm text-gray-400">
          <GlassSidebarSection title="Project Files">
            <div className="px-2 space-y-0.5">
              {['App.tsx', 'index.ts', 'components/', 'hooks/'].map((file) => (
                <div
                  key={file}
                  className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded cursor-pointer flex items-center gap-2"
                >
                  {file.endsWith('/') ? <Folder size={14} /> : <FileText size={14} />} {file}
                </div>
              ))}
            </div>
          </GlassSidebarSection>
        </div>
      ),
      search: (
        <div className="p-4 text-sm text-gray-400">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      ),
      settings: (
        <div className="p-4 text-sm text-gray-400">
          <GlassSidebarSection title="Preferences">
            <div className="px-2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span>Dark mode</span>
                <span className="text-purple-400">On</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Auto-save</span>
                <span className="text-purple-400">On</span>
              </div>
            </div>
          </GlassSidebarSection>
        </div>
      ),
    };

    return (
      <div className="flex flex-col h-full">
        {/* Mode selector */}
        <div className="p-2 bg-gray-800 border-b border-gray-700 flex gap-2">
          {(['collapsed', 'expanded', 'inline'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs rounded ${
                mode === m
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Sidebar */}
        <div className="flex-1 flex">
          <GlassSidebar
            mode={mode}
            items={blueprintNavItems}
            utilityItems={utilityNavItems}
            activeId={activeId}
            onItemSelect={setActiveId}
            panelTitle={blueprintNavItems.find((i) => i.id === activeId)?.label || activeId}
            panelContent={panelContent[activeId] || <div className="p-4 text-sm text-gray-500">No content</div>}
            version="1.0.0"
          />
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Active: <span className="ml-2 text-purple-400">{activeId}</span>
          </div>
        </div>
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-900">
        <Story />
      </div>
    ),
  ],
};

// ============================================================================
// Individual Components
// ============================================================================

/**
 * GlassSidebarItem in various states.
 */
export const SidebarItemStates: StoryObj = {
  render: () => (
    <div className="p-8 bg-gray-900 space-y-8">
      <div>
        <h3 className="text-sm text-gray-400 mb-4">Rail Mode (icon only)</h3>
        <div className="flex gap-2">
          <GlassSidebarItem icon={<NAV_ICONS.chat size={18} />} label="Chat" />
          <GlassSidebarItem icon={<NAV_ICONS.explorer size={18} />} label="Explorer" active />
          <GlassSidebarItem icon={<NAV_ICONS.search size={18} />} label="Search" badge={5} />
          <GlassSidebarItem icon={<NAV_ICONS.settings size={18} />} label="Settings" shortcut="⌘," />
        </div>
      </div>

      <div>
        <h3 className="text-sm text-gray-400 mb-4">Panel Mode (with labels)</h3>
        <div className="w-56 space-y-1">
          <GlassSidebarItem icon={<NAV_ICONS.chat size={18} />} label="Chat" showLabel />
          <GlassSidebarItem icon={<NAV_ICONS.explorer size={18} />} label="Explorer" showLabel active />
          <GlassSidebarItem icon={<NAV_ICONS.search size={18} />} label="Search" showLabel badge={5} />
          <GlassSidebarItem icon={<NAV_ICONS.settings size={18} />} label="Settings" showLabel shortcut="⌘," />
        </div>
      </div>
    </div>
  ),
  decorators: [(Story) => <Story />],
};

/**
 * GlassSidebarRail standalone.
 */
export const RailStandalone: StoryObj = {
  render: () => (
    <div className="h-[500px] bg-gray-900 flex">
      <GlassSidebarRail
        brand={<GlassSidebarBrand />}
        footer={
          <>
            <GlassSidebarItem icon={<NAV_ICONS.settings size={18} />} label="Settings" />
            <GlassSidebarItem icon={<NAV_ICONS.help size={18} />} label="Help" />
          </>
        }
      >
        <GlassSidebarItem icon={<NAV_ICONS.chat size={18} />} label="Chat" active />
        <GlassSidebarItem icon={<NAV_ICONS.explorer size={18} />} label="Explorer" />
        <GlassSidebarItem icon={<NAV_ICONS.search size={18} />} label="Search" />
        <GlassSidebarItem icon={<NAV_ICONS.context size={18} />} label="Context" badge={2} />
      </GlassSidebarRail>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Content
      </div>
    </div>
  ),
  decorators: [(Story) => <Story />],
};

/**
 * GlassSidebarPanel with sections.
 */
export const PanelWithSections: StoryObj = {
  render: function PanelDemo() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="h-[500px] bg-gray-900 flex">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-4 left-4 z-10 px-3 py-1 bg-purple-600 text-white text-xs rounded"
        >
          Toggle Panel
        </button>
        <GlassSidebarPanel isOpen={isOpen} title="Explorer" width={260}>
          <GlassSidebarSection title="Open Editors">
            <div className="px-2 space-y-0.5">
              <div className="px-2 py-1.5 text-xs text-purple-400 bg-white/5 rounded flex items-center gap-2">
                <FileText size={14} /> App.tsx
              </div>
              <div className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2">
                <FileText size={14} /> index.ts
              </div>
            </div>
          </GlassSidebarSection>
          <GlassSidebarSection title="Project Files">
            <div className="px-2 space-y-0.5">
              <div className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2">
                <Folder size={14} /> src
              </div>
              <div className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded pl-4 flex items-center gap-2">
                <Folder size={14} /> components
              </div>
              <div className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded pl-4 flex items-center gap-2">
                <Folder size={14} /> hooks
              </div>
              <div className="px-2 py-1.5 text-xs text-gray-300 hover:bg-white/5 rounded flex items-center gap-2">
                <FileText size={14} /> package.json
              </div>
            </div>
          </GlassSidebarSection>
        </GlassSidebarPanel>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Content Area
        </div>
      </div>
    );
  },
  decorators: [(Story) => <Story />],
};

/**
 * Brand variations.
 */
export const BrandVariations: StoryObj = {
  render: () => (
    <div className="p-8 bg-gray-900 flex gap-8 items-center">
      <div className="text-center">
        <GlassSidebarBrand />
        <p className="text-xs text-gray-500 mt-2">Default</p>
      </div>
      <div className="text-center">
        <GlassSidebarBrand logo={<Palette size={20} className="text-purple-400" />} name="Design App" />
        <p className="text-xs text-gray-500 mt-2">Custom Icon</p>
      </div>
      <div className="text-center">
        <GlassSidebarBrand onClick={() => alert('Home!')} />
        <p className="text-xs text-gray-500 mt-2">Clickable</p>
      </div>
    </div>
  ),
  decorators: [(Story) => <Story />],
};
