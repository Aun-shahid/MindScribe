const THERAPIST_PATIENT_ACTION_RE = /^\/therapist\/patients\/([^/]+)\/(mood|journal|history)$/i;

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

export const normalizeNotificationActionUrl = (actionUrl: string) => {
  const { pathname, search } = parsePathAndQuery(actionUrl);
  const match = pathname.match(THERAPIST_PATIENT_ACTION_RE);

  if (!match) return actionUrl;

  const patientId = match[1];
  const section = match[2].toLowerCase();
  const params = new URLSearchParams(search);

  if (section === 'mood') {
    // PatientDetail already renders the mood chart section, so route there directly.
    return buildPathWithParams(`/patients/${patientId}`, params);
  }

  if (section === 'journal') {
    params.set('focus', 'journal');
    return buildPathWithParams(`/patients/${patientId}`, params);
  }

  params.set('focus', 'history');
  return buildPathWithParams(`/patients/${patientId}`, params);
};

export const getNotificationActionLabel = (title: string, actionUrl: string | null) => {
  if (!actionUrl) return '';

  const titleLower = title.toLowerCase();
  const normalized = normalizeNotificationActionUrl(actionUrl).toLowerCase();

  if (normalized.includes('/mood')) return 'View Patient Mood';
  if (normalized.includes('/journal') || titleLower.includes('journal')) return 'View Journal Entry';
  if (normalized.includes('/history') || titleLower.includes('history')) return 'View Patient History';
  return 'View Details';
};
