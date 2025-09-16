import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Setup Zone.js testing environment
setupZoneTestEnv();

// Custom Jest setup can be added here
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => {
    return {
      display: 'none',
      appearance: ['-webkit-appearance'],
    };
  },
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});
Object.defineProperty(document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});

// Mock DOM elements and styles for Angular Material
Object.defineProperty(document, 'body', {
  writable: true,
  value: {
    style: {
      backgroundColor: '',
      fontFamily: '',
      fontSize: '',
      margin: '',
      padding: '',
    },
    setAttribute: jest.fn(),
    getAttribute: jest.fn(() => null),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
    },
  },
});

// Mock createElement for test environment
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName: string) => {
  const element = originalCreateElement.call(document, tagName);

  // Ensure all elements have proper methods
  if (!element.setAttribute) {
    element.setAttribute = jest.fn();
  }
  if (!element.getAttribute) {
    element.getAttribute = jest.fn(() => null);
  }
  if (!element.style) {
    element.style = {
      backgroundColor: '',
      color: '',
      display: '',
      position: '',
      top: '',
      left: '',
      width: '',
      height: '',
    } as any;
  }

  return element;
});

// Mock Web APIs for testing
Object.defineProperty(global, 'Blob', {
  writable: true,
  value: class MockBlob {
    constructor(
      public content: any[],
      public options: any = {},
    ) {}
    get size() {
      return this.content.length;
    }
    get type() {
      return this.options.type || '';
    }
  },
});

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'mock-blob-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Mock ResizeObserver
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: class MockResizeObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

// Mock IntersectionObserver
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: class MockIntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

// Mock MutationObserver
Object.defineProperty(global, 'MutationObserver', {
  writable: true,
  value: class MockMutationObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  },
});

// Mock console.warn for cleaner test output
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
});
