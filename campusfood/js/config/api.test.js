/**
 * @jest-environment node
 */

import { jest, describe, afterEach, test, expect } from '@jest/globals';

const ORIGINAL_WINDOW = globalThis.window;
const ORIGINAL_CONSOLE_LOG = console.log;

function setHostname(hostname) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      location: {
        hostname
      }
    }
  });
}

async function loadApiForHostname(hostname) {
  jest.resetModules();
  setHostname(hostname);

  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const module = await import('./api.js');

  return {
    ...module,
    consoleLogSpy
  };
}

function restoreWindow() {
  if (typeof ORIGINAL_WINDOW === 'undefined') {
    delete globalThis.window;
    return;
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: ORIGINAL_WINDOW
  });
}

describe('api.js', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    console.log = ORIGINAL_CONSOLE_LOG;
    restoreWindow();
  });

  test('uses the local API URL when hostname is localhost', async () => {
    const { API_BASE_URL } = await loadApiForHostname('localhost');

    expect(API_BASE_URL).toBe('http://localhost:5000');
  });

  test('uses the local API URL when hostname is 127.0.0.1', async () => {
    const { API_BASE_URL } = await loadApiForHostname('127.0.0.1');

    expect(API_BASE_URL).toBe('http://localhost:5000');
  });

  test('uses the live API URL when hostname is not local', async () => {
    const { API_BASE_URL } = await loadApiForHostname('bethuelsteven159-rgb.github.io');

    expect(API_BASE_URL).toBe('https://gigglegang-yi6v.onrender.com');
  });

  test('logs the hostname and chosen API base URL', async () => {
    const { consoleLogSpy } = await loadApiForHostname('localhost');

    expect(consoleLogSpy).toHaveBeenCalledWith('[API] hostname:', 'localhost');
    expect(consoleLogSpy).toHaveBeenCalledWith('[API] API_BASE_URL:', 'http://localhost:5000');
  });
});
