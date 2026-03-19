export type NotificationAudience = 'patient' | 'therapist';

type ParsedActionUrl = {
  pathname: string;
  query: Record<string, string>;
};

function parseQuery(queryString: string): Record<string, string> {
  if (!queryString) {
    return {};
  }

  return queryString
    .split('&')
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const [rawKey, rawValue = ''] = pair.split('=');
      const key = decodeURIComponent(rawKey || '').trim();
      const value = decodeURIComponent(rawValue || '').trim();
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function splitActionUrl(actionUrl: string): ParsedActionUrl {
  const raw = (actionUrl || '').trim();
  if (!raw) {
    return { pathname: '', query: {} };
  }

  const withoutHost = raw.replace(/^https?:\/\/[^/]+/i, '');
  const [pathname, queryString = ''] = withoutHost.split('?');
  return {
    pathname: pathname || '',
    query: parseQuery(queryString),
  };
}

function buildQueryString(params?: Record<string, string | undefined | null>): string {
  const parts = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return parts.join('&');
}

function buildPath(pathname: string, params?: Record<string, string | undefined | null>): string {
  const query = buildQueryString(params);
  return query ? `${pathname}?${query}` : pathname;
}

function normalizePatientAction(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '');

  const sessionSummaryMatch = clean.match(/^\/sessions\/([^/]+)\/summary$/i);
  if (sessionSummaryMatch) {
    return buildPath('/patient/session-detail', { id: sessionSummaryMatch[1] });
  }

  const sessionMatch = clean.match(/^\/sessions\/([^/]+)(?:\/view)?$/i);
  if (sessionMatch) {
    return buildPath('/patient/session-detail', { id: sessionMatch[1] });
  }

  const goalMatch = clean.match(/^\/goals\/([^/]+)$/i);
  if (goalMatch) {
    return buildPath('/patient/update-goal', { id: goalMatch[1] });
  }

  if (/^\/sessions$/i.test(clean)) {
    return '/patient/sessions';
  }
  if (/^\/mood$/i.test(clean)) {
    return '/patient/mood';
  }
  if (/^\/journal$/i.test(clean)) {
    return '/patient/journal-list';
  }
  if (/^\/users\/therapists$/i.test(clean)) {
    return '/patient/connect-with-therapist';
  }
  if (/^\/users\/connection-requests$/i.test(clean)) {
    return '/therapist/patients';
  }

  return '/patient/notifications';
}

function normalizeTherapistAction(pathname: string, query: Record<string, string>): string {
  const clean = pathname.replace(/\/+$/, '');

  const sessionViewMatch = clean.match(/^\/sessions\/([^/]+)(?:\/view)?$/i);
  if (sessionViewMatch) {
    return buildPath('/therapist/session-detail-view', { sessionId: sessionViewMatch[1] });
  }

  const therapistMoodMatch = clean.match(/^\/therapist\/patients\/([^/]+)\/mood$/i);
  if (therapistMoodMatch) {
    const alert = query.alert;
    return buildPath('/therapist/patient-details', { patientId: therapistMoodMatch[1], alert });
  }

  if (/^\/users\/connection-requests$/i.test(clean)) {
    return '/therapist/patients';
  }

  return '/therapist/notifications';
}

export function normalizeNotificationActionUrl(actionUrl: string | null | undefined, audience: NotificationAudience): string {
  const parsed = splitActionUrl(actionUrl || '');
  if (!parsed.pathname) {
    return audience === 'therapist' ? '/therapist/notifications' : '/patient/notifications';
  }

  if (audience === 'therapist') {
    return normalizeTherapistAction(parsed.pathname, parsed.query);
  }

  return normalizePatientAction(parsed.pathname);
}
