/**
 * Loads a vanilla JS script file (global namespace, no modules) into a vm context.
 * Returns the populated context so tests can access global functions.
 */
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

/**
 * Create a mock localStorage for testing
 */
export function createMockLocalStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    _store: store,
  };
}

/**
 * Load one or more source files into a shared vm context.
 * @param {string[]} filePaths - absolute paths to JS source files to load in order
 * @param {object} extraGlobals - additional global variables to inject
 * @returns {object} the vm context with all globals defined
 */
export function loadScripts(filePaths, extraGlobals = {}) {
  const mockLS = createMockLocalStorage();

  const context = createContext({
    localStorage: mockLS,
    document: { title: '' },
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    ...extraGlobals,
  });

  for (const filePath of filePaths) {
    const code = readFileSync(filePath, 'utf-8');
    runInContext(code, context);
  }

  return context;
}
