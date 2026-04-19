import { sb } from '../config/supabase.js';
import { toast } from '../shared/notifications.js';
import {
  setLoadingMessage,
  getUsernameFromUser,
  redirectByRole
} from '../shared/auth-helpers.js';
import { storeSessionUser } from '../shared/session.js';

export async function getExistingRole(user) {
  const username = getUsernameFromUser(user);

  if (user.email === 'admin123@campusfood.com') {
    return { role: 'admin', username };
  }

  const { data: vendorData, error: vendorError } = await sb
    .from('vendors')
    .select('id, username, status')
    .eq('id', user.id)
    .maybeSingle();

  if (!vendorError && vendorData) {
    return {
      role: 'vendor',
      username: vendorData.username || username,
      status: vendorData.status || 'pending'
    };
  }

  const { data: studentData, error: studentError } = await sb
    .from('students')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle();

  if (!studentError && studentData) {
    return {
      role: 'student',
      username: studentData.username || username
    };
  }

  return null;
}

export async function saveRoleForFirstTimeUser() {
  try {
    setLoadingMessage('Saving account type...');

    const role = document.getElementById('roleSelect')?.value;
    if (!role) {
      toast('Choose a role first', 'error');
      setLoadingMessage('');
      return;
    }

    const { data, error } = await sb.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      toast('Please sign in with Google first', 'error');
      setLoadingMessage('');
      return;
    }

    const username = getUsernameFromUser(user);

    if (role === 'vendor') {
      const { error: vendorError } = await sb
        .from('vendors')
        .upsert([{
          id: user.id,
          username,
          status: 'pending'
        }], { onConflict: 'id' });

      if (vendorError) throw vendorError;
    }

    if (role === 'student') {
      const { error: studentError } = await sb
        .from('students')
        .upsert([{
          id: user.id,
          username
        }], { onConflict: 'id' });

      if (studentError) throw studentError;
    }

    const { error: updateError } = await sb.auth.updateUser({
      data: {
        role,
        username
      }
    });

    if (updateError) {
      console.warn('Metadata update warning:', updateError.message);
    }

    storeSessionUser(user, role, username);
    redirectByRole(role);
  } catch (err) {
    console.error('Save role error:', err);
    toast(err.message || 'Failed to save role', 'error');
    setLoadingMessage('');
  }
}
