/**
 * SmartClinic V2 — Server-Side Scheduled Appointment Reminders & Notification Dispatcher
 *
 * Capabilities (Phase 12):
 * 1. Immediate booking confirmation, ~24-hour reminder, optional ~2-hour reminder,
 *    reschedule notice, and cancellation notice in Asia/Manila time.
 * 2. Works independently of active browser login sessions via server-side cron / scheduled job.
 * 3. Deduplicates reminders per (appointmentId, scheduledDate, scheduledTime, reminderType, channel)
 *    so rescheduling automatically re-arms reminders for the new slot while cancelled appointments are skipped.
 * 4. Enforces patient NotificationPreferences & consent.
 * 5. Never exposes confidential symptoms or medical details on lock-screen Web Push payloads.
 * 6. Uses Email (SMTP) as the primary cross-device fallback (especially for iPhone browsers without Home Screen install),
 *    and records honest delivery statuses (`SENT`, `DELIVERED_IN_APP`, `SKIPPED_UNCONFIGURED_PROVIDER`, `SKIPPED_PREFERENCE_DISABLED`).
 */
import type {
  Appointment,
  Notification,
  NotificationPreferences,
  Patient,
  ReminderDeliveryLog,
} from '../../types/clinic';
import { getManilaDateString, parseTimeMinutes } from '../../utils/manilaTime';
import { formatTimeSlot } from '../../utils/doctorSchedules';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { sendPrivacySafeAppointmentPush, hasPushSubscriptionForPatient } from './realtimePushService';

export function getDefaultNotificationPreferences(patientId: string): NotificationPreferences {
  return {
    patientId,
    emailEnabled: true,
    webPushEnabled: true,
    smsEnabled: false,
    reminder24hEnabled: true,
    reminder2hEnabled: false,
    consentUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Computes the exact epoch timestamp (ms) of an appointment slot in Asia/Manila (UTC+8).
 */
export function getAppointmentManilaEpochMs(dateStr: string, timeStr: string): number | null {
  const cleanDate = getManilaDateString(dateStr);
  const mins = parseTimeMinutes(timeStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || mins === null) return null;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const epoch = new Date(`${cleanDate}T${hh}:${mm}:00+08:00`).getTime();
  return isNaN(epoch) ? null : epoch;
}

function buildDedupeSignature(
  apt: Appointment,
  reminderType: ReminderDeliveryLog['reminderType'],
  channel: ReminderDeliveryLog['channel']
): string {
  return `${apt.id}::${getManilaDateString(apt.date)}::${apt.time}::${reminderType}::${channel}`;
}

export function hasReminderAlreadyRun(
  logs: ReminderDeliveryLog[],
  apt: Appointment,
  reminderType: ReminderDeliveryLog['reminderType'],
  channel: ReminderDeliveryLog['channel']
): boolean {
  const targetSig = buildDedupeSignature(apt, reminderType, channel);
  return logs.some((l) => {
    if (l.appointmentId !== apt.id || l.reminderType !== reminderType || l.channel !== channel) {
      return false;
    }
    if (reminderType === 'BOOKING_CONFIRMATION' || reminderType === 'CANCELLATION_NOTICE') {
      return true;
    }
    return l.scheduledForManila === `${getManilaDateString(apt.date)} ${apt.time}` || targetSig === `${l.appointmentId}::${l.scheduledForManila?.replace(' ', '::')}::${l.reminderType}::${l.channel}`;
  });
}

export async function dispatchAppointmentEventNotification(params: {
  appointment: Appointment;
  patient?: Patient | null;
  reminderType: ReminderDeliveryLog['reminderType'];
  preferences?: NotificationPreferences;
  existingLogs: ReminderDeliveryLog[];
  createInAppNotification: (notif: Partial<Notification> & { title: string; message: string; recipientEmail?: string }) => Promise<Notification>;
  now?: Date;
}): Promise<ReminderDeliveryLog[]> {
  const { appointment: apt, patient, reminderType, existingLogs, createInAppNotification } = params;
  const nowIso = (params.now || new Date()).toISOString();
  const prefs = params.preferences || getDefaultNotificationPreferences(apt.patientId);
  const slotManilaKey = `${getManilaDateString(apt.date)} ${apt.time}`;
  const formattedTime = formatTimeSlot(apt.time) || apt.time;
  const modeLabel = apt.consultationMode || (apt.type === 'Online Consultation' ? 'Online Consultation' : 'In-Person Consultation');
  const refLabel = apt.bookingReference || apt.id;
  const branchLabel = apt.branch || 'Main Outpatient Clinic';
  const createdLogs: ReminderDeliveryLog[] = [];

  let title = 'Appointment Confirmed';
  let inAppMessage = '';
  let lockScreenSafeBody = '';
  let emailSubject = '';

  if (reminderType === 'BOOKING_CONFIRMATION') {
    title = 'Appointment Confirmed';
    inAppMessage = `Booking ${refLabel} confirmed with ${apt.doctorName} on ${apt.date} at ${formattedTime} (${modeLabel}, ${branchLabel}).`;
    lockScreenSafeBody = `Your SmartClinic appointment (${refLabel}) on ${apt.date} at ${formattedTime} is confirmed. Sign in to view details.`;
    emailSubject = `SmartClinic — Appointment Confirmed (${refLabel})`;
  } else if (reminderType === 'REMINDER_24H') {
    title = '24-Hour Appointment Reminder';
    inAppMessage = `Reminder: You have a confirmed ${modeLabel} (${refLabel}) tomorrow, ${apt.date} at ${formattedTime}, with ${apt.doctorName} at ${branchLabel}.`;
    lockScreenSafeBody = `Reminder: You have a scheduled SmartClinic appointment tomorrow (${apt.date}) at ${formattedTime}.`;
    emailSubject = `SmartClinic — Reminder for Tomorrow's Appointment (${refLabel})`;
  } else if (reminderType === 'REMINDER_2H') {
    title = '2-Hour Appointment Reminder';
    inAppMessage = `Upcoming in ~2 hours: Your ${modeLabel} (${refLabel}) with ${apt.doctorName} is today at ${formattedTime} (${branchLabel}).`;
    lockScreenSafeBody = `Reminder: Your SmartClinic appointment is today at ${formattedTime}.`;
    emailSubject = `SmartClinic — 2-Hour Appointment Reminder (${refLabel})`;
  } else if (reminderType === 'RESCHEDULE_NOTICE') {
    title = 'Appointment Schedule Updated';
    inAppMessage = `Your appointment (${refLabel}) with ${apt.doctorName} has been updated to ${apt.date} at ${formattedTime} (${modeLabel}).`;
    lockScreenSafeBody = `Your SmartClinic appointment (${refLabel}) was moved to ${apt.date} at ${formattedTime}.`;
    emailSubject = `SmartClinic — Appointment Rescheduled (${refLabel})`;
  } else {
    title = 'Appointment Cancelled';
    inAppMessage = `Your appointment (${refLabel}) on ${apt.date} at ${formattedTime} has been cancelled. Pending reminders have been cleared.`;
    lockScreenSafeBody = `Your SmartClinic appointment (${refLabel}) on ${apt.date} has been cancelled.`;
    emailSubject = `SmartClinic — Appointment Cancelled (${refLabel})`;
  }

  // 1. Persisted In-App Notification (always stored so patient sees it upon next return)
  if (!hasReminderAlreadyRun(existingLogs, apt, reminderType, 'in_app') || reminderType === 'RESCHEDULE_NOTICE') {
    await createInAppNotification({
      recipientId: apt.patientId,
      patientId: apt.patientId,
      recipientRole: 'patient',
      targetRole: 'patient',
      recipientEmail: patient?.email,
      title,
      message: inAppMessage,
      content: inAppMessage,
      category: 'appointment',
      priority: reminderType === 'REMINDER_2H' ? 'high' : 'normal',
      relatedResourceId: apt.id,
      relatedResourceType: 'appointment',
      appointmentId: apt.id,
      link: '/?tab=appointments',
    });

    const logEntry: ReminderDeliveryLog = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-app`,
      appointmentId: apt.id,
      bookingReference: apt.bookingReference,
      patientId: apt.patientId,
      reminderType,
      channel: 'in_app',
      status: 'DELIVERED_IN_APP',
      providerNote: 'Persisted to server notification store for authenticated portal display.',
      scheduledForManila: slotManilaKey,
      attemptedAt: nowIso,
    };
    existingLogs.unshift(logEntry);
    createdLogs.push(logEntry);
  }

  // 2. Email Reminder (Primary Cross-Device Fallback for Android, Desktop & iPhone Safari)
  if (!hasReminderAlreadyRun(existingLogs, apt, reminderType, 'email') || reminderType === 'RESCHEDULE_NOTICE') {
    let status: ReminderDeliveryLog['status'] = 'SKIPPED_PREFERENCE_DISABLED';
    let providerNote = 'Patient disabled email notifications in preferences.';
    const recipientEmail = patient?.email?.trim() || '';

    if (prefs.emailEnabled) {
      if (!recipientEmail || !recipientEmail.includes('@') || recipientEmail.endsWith('.local')) {
        status = 'SKIPPED_UNCONFIGURED_PROVIDER';
        providerNote = 'No routable patient email address on file.';
      } else if (!emailService.isSmtpConfigured()) {
        status = 'SKIPPED_UNCONFIGURED_PROVIDER';
        providerNote = 'SMTP credentials (SMTP_HOST / SMTP_USER / SMTP_PASSWORD) are not configured on this server.';
      } else {
        const portalLink = `${process.env.APP_URL || ''}/?tab=appointments`;
        const sendRes = await emailService.sendMail({
          to: recipientEmail,
          subject: emailSubject,
          text: `${title}\n\nBooking Reference: ${refLabel}\nDate: ${apt.date} (${formattedTime} Asia/Manila)\nClinic Branch: ${branchLabel}\nConsultation Mode: ${modeLabel}\nAssigned Physician: ${apt.doctorName}\n\nSign in securely to your SmartClinic Patient Portal to view full appointment details or your QR check-in pass: ${portalLink}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #0f172a;">
              <h2 style="margin: 0 0 8px; color: #1d4ed8; font-size: 20px;">${title}</h2>
              <p style="margin: 0 0 16px; color: #475569; font-size: 14px;">SmartClinic Outpatient Appointment Notice (Asia/Manila Time)</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.7;">
                <div><strong>Booking Reference:</strong> ${refLabel}</div>
                <div><strong>Date &amp; Time:</strong> ${apt.date} at ${formattedTime} (PHT)</div>
                <div><strong>Clinic Branch:</strong> ${branchLabel}</div>
                <div><strong>Consultation Type:</strong> ${modeLabel}</div>
                <div><strong>Assigned Doctor:</strong> ${apt.doctorName}</div>
              </div>
              <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">For your privacy, clinical reason details are omitted from email alerts. Sign in to your SmartClinic portal to view your Appointment QR Pass or join an Online Consultation.</p>
            </div>
          `,
          purpose: reminderType.toLowerCase(),
        });

        if (sendRes.success && !sendRes.simulated) {
          status = 'SENT';
          providerNote = `Delivered via configured SMTP (${sendRes.messageId || 'OK'}).`;
        } else {
          status = 'FAILED';
          providerNote = sendRes.error || 'SMTP transport failed during send.';
        }
      }
    }

    const emailLog: ReminderDeliveryLog = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-eml`,
      appointmentId: apt.id,
      bookingReference: apt.bookingReference,
      patientId: apt.patientId,
      reminderType,
      channel: 'email',
      status,
      providerNote,
      scheduledForManila: slotManilaKey,
      attemptedAt: nowIso,
    };
    existingLogs.unshift(emailLog);
    createdLogs.push(emailLog);
  }

  // 3. Privacy-Safe Browser Web Push (Zero PHI on lock screens)
  if (!hasReminderAlreadyRun(existingLogs, apt, reminderType, 'web_push') || reminderType === 'RESCHEDULE_NOTICE') {
    let status: ReminderDeliveryLog['status'] = 'SKIPPED_PREFERENCE_DISABLED';
    let providerNote = 'Patient disabled Web Push notifications in preferences.';

    if (prefs.webPushEnabled) {
      if (!hasPushSubscriptionForPatient(apt.patientId)) {
        status = 'SKIPPED_UNCONFIGURED_PROVIDER';
        providerNote = 'No active browser PushSubscription registered for this patient (note: iPhone Safari requires Home Screen web app eligibility; email fallback used).';
      } else {
        const pushRes = await sendPrivacySafeAppointmentPush(apt.patientId, {
          appointmentId: apt.id,
          bookingReference: apt.bookingReference,
          title: `SmartClinic — ${title}`,
          body: lockScreenSafeBody,
          tag: `smartclinic-apt-${apt.id}-${reminderType.toLowerCase()}`,
          url: '/?tab=appointments',
        });
        status = pushRes.delivered > 0 ? 'SENT' : 'FAILED';
        providerNote =
          pushRes.delivered > 0
            ? `Delivered privacy-safe Web Push to ${pushRes.delivered}/${pushRes.attempted} subscribed browser(s).`
            : 'Web Push endpoint rejected or expired.';
      }
    }

    const pushLog: ReminderDeliveryLog = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-psh`,
      appointmentId: apt.id,
      bookingReference: apt.bookingReference,
      patientId: apt.patientId,
      reminderType,
      channel: 'web_push',
      status,
      providerNote,
      scheduledForManila: slotManilaKey,
      attemptedAt: nowIso,
    };
    existingLogs.unshift(pushLog);
    createdLogs.push(pushLog);
  }

  // 4. Optional SMS Channel (only if patient opted in)
  if (prefs.smsEnabled && (!hasReminderAlreadyRun(existingLogs, apt, reminderType, 'sms') || reminderType === 'RESCHEDULE_NOTICE')) {
    const smsHealth = smsService.getStatus();
    let status: ReminderDeliveryLog['status'] = 'SKIPPED_UNCONFIGURED_PROVIDER';
    let providerNote = 'Twilio SMS credentials are not configured on this server.';
    if (smsHealth.configured && patient?.phone) {
      const smsRes = await smsService.sendSms({
        to: patient.phone,
        message: lockScreenSafeBody,
        purpose: reminderType.toLowerCase(),
      });
      if (smsRes.success && !smsRes.simulated) {
        status = 'SENT';
        providerNote = 'Delivered via configured SMS gateway.';
      } else {
        status = 'SKIPPED_UNCONFIGURED_PROVIDER';
        providerNote = smsRes.error || 'SMS gateway unconfigured or simulated.';
      }
    }
    const smsLog: ReminderDeliveryLog = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-sms`,
      appointmentId: apt.id,
      bookingReference: apt.bookingReference,
      patientId: apt.patientId,
      reminderType,
      channel: 'sms',
      status,
      providerNote,
      scheduledForManila: slotManilaKey,
      attemptedAt: nowIso,
    };
    existingLogs.unshift(smsLog);
    createdLogs.push(smsLog);
  }

  return createdLogs;
}

/**
 * Evaluates all confirmed/scheduled non-walk-in appointments against `now` (Asia/Manila)
 * and dispatches due 24-hour and optional 2-hour reminders without duplicates.
 * Cancelled and No-Show appointments are strictly skipped.
 */
export async function evaluateDueAppointmentReminders(params: {
  appointments: Appointment[];
  patients: Patient[];
  preferencesByPatient: Map<string, NotificationPreferences>;
  existingLogs: ReminderDeliveryLog[];
  createInAppNotification: (notif: Partial<Notification> & { title: string; message: string; recipientEmail?: string }) => Promise<Notification>;
  defaultReminder24h?: boolean;
  defaultReminder2h?: boolean;
  now?: Date;
}): Promise<{
  evaluatedCount: number;
  triggered24h: string[];
  triggered2h: string[];
  logsCreated: ReminderDeliveryLog[];
}> {
  const now = params.now || new Date();
  const nowMs = now.getTime();
  const triggered24h: string[] = [];
  const triggered2h: string[] = [];
  const logsCreated: ReminderDeliveryLog[] = [];
  let evaluatedCount = 0;

  for (const apt of params.appointments) {
    if (apt.isSynthetic) continue;
    if (apt.isWalkIn || apt.type === 'Walk-In') continue;
    if (apt.status !== 'Confirmed' && apt.status !== 'Scheduled') continue;

    const aptEpochMs = getAppointmentManilaEpochMs(apt.date, apt.time);
    if (aptEpochMs === null) continue;

    const hoursUntil = (aptEpochMs - nowMs) / (1000 * 60 * 60);
    if (hoursUntil <= 0) continue; // Past appointment

    evaluatedCount += 1;
    const patient = params.patients.find((p) => p.id === apt.patientId) || null;
    const basePrefs = params.preferencesByPatient.get(apt.patientId) || {
      ...getDefaultNotificationPreferences(apt.patientId),
      reminder24hEnabled: params.defaultReminder24h ?? true,
      reminder2hEnabled: params.defaultReminder2h ?? false,
    };

    // 24-hour reminder window: between 2.5h and 26h prior to appointment
    // (Wide window ensures both frequent cron runs and Vercel Hobby daily cron catch tomorrow's appointments cleanly)
    if (basePrefs.reminder24hEnabled && hoursUntil <= 26 && hoursUntil > 2.5) {
      if (!hasReminderAlreadyRun(params.existingLogs, apt, 'REMINDER_24H', 'in_app')) {
        const newLogs = await dispatchAppointmentEventNotification({
          appointment: apt,
          patient,
          reminderType: 'REMINDER_24H',
          preferences: basePrefs,
          existingLogs: params.existingLogs,
          createInAppNotification: params.createInAppNotification,
          now,
        });
        apt.reminder24hSentAt = now.toISOString();
        triggered24h.push(apt.id);
        logsCreated.push(...newLogs);
      }
    }

    // Optional 2-hour reminder window: between 15m and 2.5h prior to appointment
    if (basePrefs.reminder2hEnabled && hoursUntil <= 2.5 && hoursUntil >= 0.25) {
      if (!hasReminderAlreadyRun(params.existingLogs, apt, 'REMINDER_2H', 'in_app')) {
        const newLogs = await dispatchAppointmentEventNotification({
          appointment: apt,
          patient,
          reminderType: 'REMINDER_2H',
          preferences: basePrefs,
          existingLogs: params.existingLogs,
          createInAppNotification: params.createInAppNotification,
          now,
        });
        apt.reminder2hSentAt = now.toISOString();
        triggered2h.push(apt.id);
        logsCreated.push(...newLogs);
      }
    }
  }

  return {
    evaluatedCount,
    triggered24h,
    triggered2h,
    logsCreated,
  };
}
