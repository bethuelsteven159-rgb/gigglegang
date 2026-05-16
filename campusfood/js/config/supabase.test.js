/**
 * @jest-environment node
 */

import { jest, describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPABASE_FILE = path.join(__dirname, 'supabase.js');
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

function readSupabaseSource() {
  return fs.readFileSync(SUPABASE_FILE, 'utf8');
}

function executeSupabaseSource() {
  const source = readSupabaseSource();

  const fakeClient = {
    auth: {},
    from: jest.fn()
  };

  const createClientMock = jest.fn(() => fakeClient);

  const executableSource = source
    .replace(
      /import\s*\{\s*createClient\s*\}\s*from\s*['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/\+esm['"];?\s*/,
      ''
    )
    .replace(/export\s+const\s+sb\s*=/, 'const sb =')
    .concat('\nreturn { sb };');

  const moduleExports = new Function('createClient', executableSource)(createClientMock);

  return {
    ...moduleExports,
    source,
    fakeClient,
    createClientMock
  };
}

describe('supabase.js', () => {
  test('keeps the Supabase CDN import in the source file', () => {
    const source = readSupabaseSource();

    expect(source).toContain(SUPABASE_CDN);
  });

  test('creates and exports a Supabase client', () => {
    const { sb, fakeClient, createClientMock } = executeSupabaseSource();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(sb).toBe(fakeClient);
  });

  test('creates the client with the project URL and anon key', () => {
    const { createClientMock } = executeSupabaseSource();

    expect(createClientMock).toHaveBeenCalledWith(
      'https://mslvqduxmkuusuyaewej.supabase.co',
      expect.stringMatching(/^eyJ/)
    );
  });
});
