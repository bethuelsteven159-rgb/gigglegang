import { signInWithGoogle, checkLoginAfterRedirect } from '../auth/login.js';
import { saveRoleForFirstTimeUser } from '../auth/role-selection.js';

export function initIndexPage() {
  const googleBtn = document.getElementById('googleLoginBtn');
  const saveRoleBtn = document.getElementById('saveRoleBtn');

  if (googleBtn) {
    googleBtn.addEventListener('click', signInWithGoogle);
  }

  if (saveRoleBtn) {
    saveRoleBtn.addEventListener('click', saveRoleForFirstTimeUser);
  }

  checkLoginAfterRedirect();
}
