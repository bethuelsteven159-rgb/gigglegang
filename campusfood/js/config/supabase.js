const SUPABASE_URL = 'https://mslvqduxmkuusuyaewej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHZxZHV4bWt1dXN1eWFld2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODkzNDcsImV4cCI6MjA5MTU2NTM0N30.VxvR39nI5lNK_JZ6fwctQJgAH06YhbCTd8bXuiLpJgs';

// Lazy singleton — only calls window.supabase.createClient when first used,
// not at module evaluation time. This keeps Jest tests safe without needing
// window.supabase to exist in the test environment.
let _sb = null;

export const sb = new Proxy({}, {
  get(_target, prop) {
    if (!_sb) {
      _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    const value = _sb[prop];
    return typeof value === 'function' ? value.bind(_sb) : value;
  }
});
