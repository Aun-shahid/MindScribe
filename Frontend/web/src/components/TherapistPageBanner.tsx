import type { ReactNode } from 'react';

const DEFAULT_IMAGE = '/images/pat.png';

export type TherapistPageBannerProps = {
  children: ReactNode;
  /** Height of the banner strip, e.g. `h-40` or `min-h-[200px]` for dense content */
  heightClassName?: string;
  imageSrc?: string;
  imageAlt?: string;
};

/**
 * Shared hero strip: purple bar + pat.png + overlay. Use across therapist pages for consistent look.
 */
export function TherapistPageBanner({
  children,
  heightClassName = 'h-40',
  imageSrc = DEFAULT_IMAGE,
  imageAlt = '',
}: TherapistPageBannerProps) {
  return (
    <div
      className={`relative w-full bg-[#2f224a] mt-1 rounded-xl overflow-hidden ${heightClassName}`}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#5c4092] opacity-60" aria-hidden />
      {children}
    </div>
  );
}

export type TherapistPageSimpleHeroProps = {
  title: string;
  subtitle: string;
  /** Top-right slot (links, buttons). Uses flex-wrap for narrow screens. */
  actions?: ReactNode;
};

/**
 * Title + subtitle anchored bottom-left; optional actions top-right (Patients-style).
 */
export function TherapistPageSimpleHero({ title, subtitle, actions }: TherapistPageSimpleHeroProps) {
  return (
    <>
      {actions != null ? (
        <div className="absolute right-4 top-3 z-20 flex max-w-[calc(100%-2rem)] flex-wrap justify-end gap-2">
          {actions}
        </div>
      ) : null}
      <div className="absolute bottom-4 left-4 z-10 max-w-[min(100%-2rem,42rem)] text-white">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-purple-100">{subtitle}</p>
      </div>
    </>
  );
}

/** Primary header CTA (matches Patients “Add Patient”) */
export const therapistHeroPrimaryButtonClass =
  'bg-[#43275a] hover:bg-[#2d183a] text-white px-4 py-2 rounded-md text-sm font-semibold shadow-md inline-flex items-center justify-center transition-colors';
