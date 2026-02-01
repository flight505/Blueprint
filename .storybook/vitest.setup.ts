import { beforeAll, afterEach } from 'vitest';
import { setProjectAnnotations } from '@storybook/react';
import * as projectAnnotations from './preview';

// Apply Storybook's project annotations (decorators, parameters, etc.) to Vitest
const annotations = setProjectAnnotations([projectAnnotations]);

beforeAll(annotations.beforeAll);

afterEach(() => {
  // Clean up after each test if needed
});
