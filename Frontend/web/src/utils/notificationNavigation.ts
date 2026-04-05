const THERAPIST_PATIENT_ACTION_RE = /^\/therapist\/patients\/([^/]+)\/(mood|journal|history)$/i;

type NotificationRouteContext = {
  action_url?: string | null;
  title?: string;
  message?: string;
  notification_type?: string;
  patient?: string;
};

const parsePathAndQuery = (actionUrl: string) => {
  if (!actionUrl) return { pathname: '', search: '' };

  try {
    const parsed = actionUrl.startsWith('http')
      ? new URL(actionUrl)
      : new URL(actionUrl, 'http://local.dev');
    return { pathname: parsed.pathname, search: parsed.search };
  } catch {
    return { pathname: actionUrl, search: '' };
  }
};

const buildPathWithParams = (pathname: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const extractPatientIdFromPath = (path: string) => {
  const match = path.match(/^\/patients\/([^/?#]+)/i);
  return match?.[1] || '';
};

export const normalizeNotificationActionUrl = (actionUrl: string) => {
  const { pathname, search } = parsePathAndQuery(actionUrl);
  const match = pathname.match(THERAPIST_PATIENT_ACTION_RE);

  if (pathname === '/users/connection-requests') {
    return '/qr-code';
  }

  if (!match) return actionUrl;

  const patientId = match[1];
  const section = match[2].toLowerCase();
  const params = new URLSearchParams(search);

  if (section === 'mood') {
    return buildPathWithParams(`/patients/${patientId}/mood`, params);
  }

  if (section === 'journal') {
    params.set('focus', 'journal');
    return buildPathWithParams(`/patients/${patientId}`, params);
  }

  params.set('focus', 'history');
  return buildPathWithParams(`/patients/${patientId}`, params);
};

export const resolveNotificationActionUrl = (notification: NotificationRouteContext) => {
  const actionUrl = notification.action_url || '';
  const normalized = actionUrl ? normalizeNotificationActionUrl(actionUrl) : '';

  if (normalized === '/qr-code') {
    return '/qr-code?view=pending&source=notification';
  }

  const titleLower = (notification.title || '').toLowerCase();
  const messageLower = (notification.message || '').toLowerCase();
  const typeLower = (notification.notification_type || '').toLowerCase();
  const combinedText = `${titleLower} ${messageLower}`;
  const normalizedPatientId = extractPatientIdFromPath(normalized);
  // Prefer action-url patient id; notification.patient can occasionally be recipient id.
  const patientId = normalizedPatientId || notification.patient || '';

  const isConnectionRequest =
    actionUrl.includes('/users/connection-requests') ||
    combinedText.includes('connection request') ||
    typeLower.includes('connection');

  if (isConnectionRequest) {
    return '/qr-code?view=pending&source=notification';
  }

  const isMoodRelated =
    normalized.includes('/mood') ||
    typeLower.includes('mood') ||
    combinedText.includes('mood');

  const isUrgentMoodAlert =
    isMoodRelated &&
    (combinedText.includes('urgent') || combinedText.includes('alert') || combinedText.includes('immediate'));

  if (isUrgentMoodAlert && patientId) {
    return `/patients/${patientId}`;
  }

  if (isMoodRelated && patientId) {
    return `/patients/${patientId}/mood`;
  }

  return normalized || '/notifications';
};

export const getNotificationActionLabel = (title: string, actionUrl: string | null) => {
  if (!actionUrl) return '';

  const titleLower = title.toLowerCase();
  const normalized = normalizeNotificationActionUrl(actionUrl).toLowerCase();

  if (normalized.includes('/qr-code')) return 'Open QR Code';
  if (normalized.includes('/mood')) return 'View Patient Mood';
  if (normalized.includes('/journal') || titleLower.includes('journal')) return 'View Journal Entry';
  if (normalized.includes('/history') || titleLower.includes('history')) return 'View Patient History';
  return 'View Details';
};
