/**
 * SmartClinic — Real-Time WebSocket Hub & Privacy-Safe Web Push Service
 * Runs on the same HTTP server port (3000) via /ws/clinic upgrade handling.
 * Enforces strict per-patient socket isolation and non-PHI lock-screen push payloads.
 */
import type { IncomingMessage, Server as HttpServer } from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import webpush from 'web-push';
import { verifyToken, getSessionStatus, type UserTokenPayload } from './authService';

export interface PushSubscriptionRecord {
  userId: string;
  patientId?: string | null;
  role: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  userAgent?: string;
}

interface AuthenticatedSocket {
  ws: WebSocket;
  user: UserTokenPayload;
  connectedAt: number;
}

const VAPID_CACHE_FILE = path.join('/tmp', 'smart_clinic_vapid.json');
const PUSH_SUBS_FILE = path.join('/tmp', 'smart_clinic_push_subs.json');

let vapidKeys: { publicKey: string; privateKey: string } | null = null;
let pushSubscriptions: PushSubscriptionRecord[] = [];

const patientSockets = new Map<string, Set<AuthenticatedSocket>>();
const staffAndAdminSockets = new Set<AuthenticatedSocket>();

function initVapidConfiguration(): { publicKey: string; privateKey: string } {
  if (vapidKeys) return vapidKeys;

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:notifications@smartclinic.ph';

  if (envPub && envPriv) {
    vapidKeys = { publicKey: envPub, privateKey: envPriv };
  } else {
    try {
      if (fs.existsSync(VAPID_CACHE_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(VAPID_CACHE_FILE, 'utf-8'));
        if (parsed?.publicKey && parsed?.privateKey) {
          vapidKeys = { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
        }
      }
    } catch {
      // Regenerate below if cache unreadable
    }

    if (!vapidKeys) {
      const generated = webpush.generateVAPIDKeys();
      vapidKeys = {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
      };
      try {
        fs.writeFileSync(VAPID_CACHE_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
      } catch {
        // Non-fatal in read-only environments
      }
    }
  }

  try {
    webpush.setVapidDetails(subject, vapidKeys.publicKey, vapidKeys.privateKey);
  } catch (err) {
    console.warn('[WebPush] VAPID initialization warning:', err);
  }

  try {
    if (fs.existsSync(PUSH_SUBS_FILE)) {
      const rawSubs = JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf-8'));
      if (Array.isArray(rawSubs)) {
        pushSubscriptions = rawSubs;
      }
    }
  } catch {
    pushSubscriptions = [];
  }

  return vapidKeys;
}

function persistPushSubscriptions(): void {
  try {
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(pushSubscriptions, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

export function getVapidPublicKey(): string {
  return initVapidConfiguration().publicKey;
}

export function subscribeUserPush(record: Omit<PushSubscriptionRecord, 'createdAt'>): PushSubscriptionRecord {
  initVapidConfiguration();
  // Remove duplicate endpoint or stale binding on the same device
  pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== record.endpoint);
  const saved: PushSubscriptionRecord = {
    ...record,
    createdAt: new Date().toISOString(),
  };
  pushSubscriptions.push(saved);
  persistPushSubscriptions();
  return saved;
}

export function unsubscribeUserPush(userId: string, endpoint?: string): number {
  initVapidConfiguration();
  const before = pushSubscriptions.length;
  pushSubscriptions = pushSubscriptions.filter((s) => {
    if (s.userId !== userId && s.patientId !== userId) return true;
    if (endpoint && s.endpoint !== endpoint) return true;
    return false;
  });
  persistPushSubscriptions();
  return before - pushSubscriptions.length;
}

export function clearPushSubscriptionsForUser(userId: string, linkedPatientId?: string | null): number {
  initVapidConfiguration();
  const before = pushSubscriptions.length;
  pushSubscriptions = pushSubscriptions.filter(
    (s) => s.userId !== userId && (!linkedPatientId || s.patientId !== linkedPatientId)
  );
  persistPushSubscriptions();
  return before - pushSubscriptions.length;
}

/**
 * Sends a privacy-safe Web Push notification to a specific patient's subscribed browsers/PWA.
 * NEVER includes confidential medical details, symptoms, diagnoses, or patient full name on lock screens.
 */
export async function sendPrivacySafeQueuePush(
  patientId: string,
  details: {
    appointmentId: string;
    queueNumber?: string;
    room?: string;
    calledAt: string;
  }
): Promise<{ attempted: number; delivered: number }> {
  initVapidConfiguration();
  const targets = pushSubscriptions.filter(
    (s) => s.patientId === patientId || s.userId === patientId
  );
  if (targets.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  const queueLabel = details.queueNumber ? `Queue ${details.queueNumber} — ` : '';
  const roomLabel = details.room ? ` (${details.room})` : '';
  const safePayload = JSON.stringify({
    title: "It's Your Turn!",
    body: `${queueLabel}Clinic staff is ready for you. Please proceed to the designated clinic room${roomLabel}.`,
    tag: `smartclinic-call-${details.appointmentId}`,
    url: '/?tab=dashboard&queueCall=1',
    appointmentId: details.appointmentId,
    queueNumber: details.queueNumber || null,
    room: details.room || 'Designated Clinic Room',
    calledAt: details.calledAt,
  });

  let delivered = 0;
  const expiredEndpoints = new Set<string>();

  await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          safePayload,
          { TTL: 300, urgency: 'high' }
        );
        delivered += 1;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.add(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.size > 0) {
    pushSubscriptions = pushSubscriptions.filter((s) => !expiredEndpoints.has(s.endpoint));
    persistPushSubscriptions();
  }

  return { attempted: targets.length, delivered };
}

export function hasPushSubscriptionForPatient(patientId: string): boolean {
  initVapidConfiguration();
  return pushSubscriptions.some((s) => s.patientId === patientId || s.userId === patientId);
}

/**
 * Sends a privacy-safe Web Push notification for appointment confirmations, 24h/2h reminders,
 * reschedules, or cancellations. NEVER exposes diagnoses, symptoms, or patient medical details on lock screens.
 */
export async function sendPrivacySafeAppointmentPush(
  patientId: string,
  details: {
    appointmentId: string;
    bookingReference?: string;
    title: string;
    body: string;
    tag: string;
    url?: string;
  }
): Promise<{ attempted: number; delivered: number }> {
  initVapidConfiguration();
  const targets = pushSubscriptions.filter(
    (s) => s.patientId === patientId || s.userId === patientId
  );
  if (targets.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  const safePayload = JSON.stringify({
    title: details.title,
    body: details.body,
    tag: details.tag,
    url: details.url || '/?tab=appointments',
    appointmentId: details.appointmentId,
    bookingReference: details.bookingReference || null,
  });

  let delivered = 0;
  const expiredEndpoints = new Set<string>();

  await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          safePayload,
          { TTL: 3600, urgency: 'normal' }
        );
        delivered += 1;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.add(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.size > 0) {
    pushSubscriptions = pushSubscriptions.filter((s) => !expiredEndpoints.has(s.endpoint));
    persistPushSubscriptions();
  }

  return { attempted: targets.length, delivered };
}

function sendJson(ws: WebSocket, event: string, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, payload, timestamp: new Date().toISOString() }));
  }
}

export function emitToPatient(patientId: string, event: string, payload: unknown): number {
  if (!patientId) return 0;
  const set = patientSockets.get(patientId);
  if (!set || set.size === 0) return 0;
  let sent = 0;
  for (const client of set) {
    if (client.ws.readyState === WebSocket.OPEN) {
      sendJson(client.ws, event, payload);
      sent += 1;
    }
  }
  return sent;
}

export function emitToStaffAndAdmin(event: string, payload: unknown): number {
  let sent = 0;
  for (const client of staffAndAdminSockets) {
    if (client.ws.readyState === WebSocket.OPEN) {
      sendJson(client.ws, event, payload);
      sent += 1;
    }
  }
  return sent;
}

export function emitToSpecificUser(userId: string, event: string, payload: unknown): number {
  if (!userId) return 0;
  let sent = emitToPatient(userId, event, payload);
  for (const client of staffAndAdminSockets) {
    if (client.user.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      sendJson(client.ws, event, payload);
      sent += 1;
    }
  }
  return sent;
}

export function disconnectUserSockets(userId: string, linkedPatientId?: string | null): void {
  if (linkedPatientId && patientSockets.has(linkedPatientId)) {
    for (const entry of patientSockets.get(linkedPatientId) || []) {
      try {
        sendJson(entry.ws, 'session:revoked', { reason: 'logged_out' });
        entry.ws.close(4001, 'Session closed');
      } catch {
        // ignore
      }
    }
    patientSockets.delete(linkedPatientId);
  }
  for (const entry of Array.from(staffAndAdminSockets)) {
    if (entry.user.userId === userId) {
      try {
        sendJson(entry.ws, 'session:revoked', { reason: 'logged_out' });
        entry.ws.close(4001, 'Session closed');
      } catch {
        // ignore
      }
      staffAndAdminSockets.delete(entry);
    }
  }
}

export function attachClinicWebSocketServer(httpServer: HttpServer): WebSocketServer {
  initVapidConfiguration();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    try {
      const host = request.headers.host || 'localhost:3000';
      const parsedUrl = new URL(request.url || '/', `http://${host}`);
      if (parsedUrl.pathname !== '/ws/clinic') {
        return; // Allow other upgrade listeners (if any) or close cleanly
      }

      const token = parsedUrl.searchParams.get('token') || '';
      const verified = verifyToken(token);
      if (!verified) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const sessionStatus = getSessionStatus(token, verified);
      if (!sessionStatus.valid) {
        socket.write('HTTP/1.1 401 Session Expired\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, verified);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, _request: IncomingMessage, user: UserTokenPayload) => {
    const client: AuthenticatedSocket = {
      ws,
      user,
      connectedAt: Date.now(),
    };

    const patientKey = user.linkedPatientId || (user.role === 'patient' ? user.userId : null);
    if (user.role === 'patient' && patientKey) {
      if (!patientSockets.has(patientKey)) {
        patientSockets.set(patientKey, new Set());
      }
      patientSockets.get(patientKey)!.add(client);
    } else {
      staffAndAdminSockets.add(client);
    }

    sendJson(ws, 'ws:connected', {
      userId: user.userId,
      role: user.role,
      patientId: patientKey,
    });

    ws.on('close', () => {
      if (patientKey && patientSockets.has(patientKey)) {
        const set = patientSockets.get(patientKey)!;
        set.delete(client);
        if (set.size === 0) patientSockets.delete(patientKey);
      }
      staffAndAdminSockets.delete(client);
    });

    ws.on('error', () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    });
  });

  return wss;
}
