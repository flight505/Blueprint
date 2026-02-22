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
      <div className="flex h-[400px] bg-surface-deep">
        <div
          className="flex-shrink-0 bg-surface-raised border-r border-border-default p-4"
          style={{ width }}
        >
          <p className="text-fg-muted text-sm">Panel — {width}px</p>
        </div>
        <ResizeHandle currentWidth={width} onWidthChange={setWidth} />
        <div className="flex-1 p-4">
          <p className="text-fg-muted text-sm">Content area</p>
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
      <div className="flex h-[400px] bg-surface-deep">
        <div
          className="flex-shrink-0 bg-surface-raised border-r border-border-default p-4"
          style={{ width }}
        >
          <p className="text-fg-muted text-sm">Min 150 / Max 400</p>
          <p className="text-fg-muted text-xs mt-1">{width}px</p>
        </div>
        <ResizeHandle
          currentWidth={width}
          onWidthChange={setWidth}
          minWidth={150}
          maxWidth={400}
        />
        <div className="flex-1 p-4">
          <p className="text-fg-muted text-sm">Content area</p>
        </div>
      </div>
    );
  },
};
