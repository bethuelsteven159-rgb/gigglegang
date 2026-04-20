import { jest } from '@jest/globals';
import { toast, requestNotificationPermission } from './notifications.js';

describe('notifications.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('toast updates the toast element and clears it after timeout', () => {
    document.body.innerHTML = '<div id="toast"></div>';

    const el = document.getElementById('toast');

    toast('Saved successfully', 'success');

    expect(el.textContent).toBe('Saved successfully');
    expect(el.className).toBe('show success');

    jest.advanceTimersByTime(3000);

    expect(el.className).toBe('');
  });

  test('toast does nothing if toast element does not exist', () => {
    expect(() => toast('Hello', 'error')).not.toThrow();
  });

  test('requestNotificationPermission logs message if Notification is not supported', async () => {
    const originalNotification = window.Notification;
    delete window.Notification;

    await requestNotificationPermission();

    expect(console.log).toHaveBeenCalledWith(
      'This browser does not support notifications'
    );

    window.Notification = originalNotification;
  });

  test('requestNotificationPermission returns immediately when permission is granted', async () => {
    const originalNotification = window.Notification;

    window.Notification = {
      permission: 'granted',
      requestPermission: jest.fn()
    };

    await requestNotificationPermission();

    expect(window.Notification.requestPermission).not.toHaveBeenCalled();

    window.Notification = originalNotification;
  });

  test('requestNotificationPermission returns immediately when permission is denied', async () => {
    const originalNotification = window.Notification;

    window.Notification = {
      permission: 'denied',
      requestPermission: jest.fn()
    };

    await requestNotificationPermission();

    expect(window.Notification.requestPermission).not.toHaveBeenCalled();

    window.Notification = originalNotification;
  });

  test('requestNotificationPermission requests permission and logs success when granted', async () => {
    const originalNotification = window.Notification;

    window.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted')
    };

    await requestNotificationPermission();

    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Notification permission granted');

    window.Notification = originalNotification;
  });

  test('requestNotificationPermission logs error when requestPermission fails', async () => {
    const originalNotification = window.Notification;

    window.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockRejectedValue(new Error('boom'))
    };

    await requestNotificationPermission();

    expect(console.error).toHaveBeenCalled();

    window.Notification = originalNotification;
  });
});