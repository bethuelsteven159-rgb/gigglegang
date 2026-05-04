import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import {
  setLoadingMessage,
  showRoleSection,
  getUsernameFromUser,
  redirectByRole
} from '../shared/auth-helpers.js';
import { storeSessionUser } from '../shared/session.js';
import { getExistingRole } from './role-selection.js';

export async function signInWithGoogle() {
  try {
    setLoadingMessage('Redirecting to Google...');
    console.log(
      "Google redirect URL:",
      new URL("index.html", window.location.href).href
    );


    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: new URL("index.html", window.location.href).href
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error('Google login error:', err);
    toast(err.message || 'Google sign in failed', 'error');
    setLoadingMessage('');
  }
}

export async function checkLoginAfterRedirect() {
  try {
    setLoadingMessage('Checking your account...');

    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      setLoadingMessage('');
      return;
    }

    const username = getUsernameFromUser(user);
    const existingRole = await getExistingRole(user);

    if (!existingRole) {
      setLoadingMessage('');
      showRoleSection(true);
      return;
    }

    storeSessionUser(user, existingRole.role, existingRole.username || username);
    setLoadingMessage('');
    redirectByRole(existingRole.role);
  } catch (err) {
    console.error('Session check error:', err);
    toast(err.message || 'Failed to check login', 'error');
    setLoadingMessage('');
  }
}
