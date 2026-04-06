/**
 * Shared layout tokens for therapist app pages (inside Layout).
 * Layout already applies horizontal padding; shells should not add duplicate px.
 */

/** Full-width canvas (lists, flows) — matches Sessions / Tools / Profile. */
export const THERAPIST_PAGE_CANVAS = 'min-h-screen w-full bg-[#f7f7fa]';

/** Max-width column + same canvas as primary hub pages. */
export const THERAPIST_PAGE_SHELL =
  'mx-auto min-h-screen max-w-7xl w-full overflow-x-hidden bg-[#f7f7fa]';

/** Session / patient detail views — soft purple-gray gradient. */
export const THERAPIST_DETAIL_FLOW_BG =
  'min-h-screen w-full bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50';
