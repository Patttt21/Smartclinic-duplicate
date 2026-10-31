/**
 * SmartClinic — Browser & Mobile PWA Web Push Subscription Client
 * Handles VAPID public key retrieval, Service Worker PushManager subscription,
 * graceful fallback detection, and subscription cleanup on logout.
 */

export type PushSupportState =
  | 'unsupported'
  | 'permission_denied'
  | 'prompt_needed'
  | 'subscribed'
  | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushSubscriptionState(): Promise<PushSupportState> {
  if (!isWebPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'permission_denied';

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return 'prompt_needed';
    const existing = await registration.pushManager.getSubscription();
    return existing ? 'subscribed' : 'prompt_needed';
  } catch {
    return 'prompt_needed';
  }
}

export async function enablePatientPushNotifications(authToken: string): Promise<{
  success: boolean;
  state: PushSupportState;
  message: string;
}> {
  if (!isWebPushSupported()) {
    return {
      success: false,
      state: 'unsupported',
      message:
        'Browser/device push notifications are not supported in this environment. In-app real-time alerts remain active while your portal is open.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        state: 'permission_denied',
        message:
          'Notification permission was declined. You will still receive real-time in-app alerts inside SmartClinic.',
      };
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyData?.publicKey) {
      throw new Error('Unable to retrieve clinic VAPID public key.');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    if (!subRes.ok) {
      throw new Error('Failed to bind push subscription to patient account.');
    }

    return {
      success: true,
      state: 'subscribed',
      message:
        'Mobile & browser push alerts enabled! You will receive privacy-safe notifications when clinic staff calls your queue number.',
    };
  } catch (err: any) {
    return {
      success: false,
      state: 'error',
      message:
        err?.message ||
        'Push subscription could not be activated in this browser context. Real-time in-app notifications remain active.',
    };
  }
}

export async function disablePatientPushNotifications(authToken?: string): Promise<void> {
  if (!isWebPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const existing = await registration?.pushManager.getSubscription();
    const endpoint = existing?.endpoint;
    if (existing) {
      await existing.unsubscribe();
    }
    if (endpoint && authToken) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ endpoint }),
      });
    }
  } catch {
    // Non-fatal cleanup
  }
}

/**
 * Triggers a local privacy-safe browser Notification when the page is in the background
 * and Notification.permission === 'granted' (supplements WebSocket push).
 */
export function showLocalBrowserQueueNotification(details: {
  queueNumber?: string;
  room?: string;
  appointmentId: string;
}): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    const queuePrefix = details.queueNumber ? `Queue ${details.queueNumber} — ` : '';
    const roomSuffix = details.room ? ` (${details.room})` : '';
    new Notification("It's Your Turn!", {
      body: `${queuePrefix}Clinic staff is ready for you. Please proceed to the designated clinic room${roomSuffix}.`,
      icon: '/pwa-192x192.png',
      tag: `smartclinic-call-${details.appointmentId}`,
    });
  } catch {
    // Ignore if Notification constructor restricted on mobile SW-only browsers
  }
}
