export function toast(message, type = 'success') {
  const el = document.getElementById('toast');

  if (!el) {
    console.warn('Toast element #toast not found');
    alert(message);
    return;
  }

  el.textContent = message;
  el.className = `show ${type}`;

  setTimeout(() => {
    el.className = '';
  }, 3000);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    return;
  }

  if (Notification.permission === 'denied') {
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    toast("Notifications enabled! You'll receive order updates.", 'success');
  }
}
