export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) {
    alert(msg);
    return;
  }

  el.textContent = msg;
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
    console.log('Notifications already enabled');
    return;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast("Notifications enabled! You'll receive order updates.", 'success');
    }
  }
}
