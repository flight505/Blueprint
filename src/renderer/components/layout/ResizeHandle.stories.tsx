import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ResizeHandle } from './ResizeHandle';

const meta = {
  title: 'Components/Layout/ResizeHandle',
  component: ResizeHandle,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ResizeHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive demo with two panes separated by the resize handle. */
export const Default: Story = {
  args: { currentWidth: 320, onWidthChange: fn() },
  render: () => {
    const [width, setWidth] = useState(320);
    return (
      <div className="flex h-[400px] bg-[#1f2335]">
        <div
          className="flex-shrink-0 bg-white/[0.04] border-r border-white/[0.06] p-4"
          style={{ width }}
        >
          <p className="text-gray-400 text-sm">Panel — {width}px</p>
        </div>
        <ResizeHandle currentWidth={width} onWidthChange={setWidth} />
        <div className="flex-1 p-4">
          <p className="text-gray-400 text-sm">Content area</p>
        </div>
      </div>
    );
  },
};

/** With custom min/max constraints. */
export const CustomBounds: Story = {
  args: { currentWidth: 200, onWidthChange: fn() },
  render: () => {
    const [width, setWidth] = useState(200);
    return (
      <div className="flex h-[400px] bg-[#1f2335]">
        <div
          className="flex-shrink-0 bg-white/[0.04] border-r border-white/[0.06] p-4"
          style={{ width }}
        >
          <p className="text-gray-400 text-sm">Min 150 / Max 400</p>
          <p className="text-gray-500 text-xs mt-1">{width}px</p>
        </div>
        <ResizeHandle
          currentWidth={width}
          onWidthChange={setWidth}
          minWidth={150}
          maxWidth={400}
        />
        <div className="flex-1 p-4">
          <p className="text-gray-400 text-sm">Content area</p>
        </div>
      </div>
    );
  },
};
