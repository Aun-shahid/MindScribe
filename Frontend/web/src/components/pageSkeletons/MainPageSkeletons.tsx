import { THERAPIST_PAGE_CANVAS, THERAPIST_PAGE_SHELL } from '../../constants/pageShell';

/** Base pulse block — use for layout placeholders */
export function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/90 ${className}`} />;
}

/** Dashboard: metrics, charts, and summary cards */
export function DashboardPageSkeleton() {
  return (
    <div
      className={`${THERAPIST_PAGE_CANVAS} pb-12`}
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-7">
            <Sk className="h-9 w-2/3 max-w-md" />
            <Sk className="h-4 w-full max-w-sm" />
            <div className="mt-5 flex flex-wrap gap-2">
              <Sk className="h-8 w-44 rounded-full" />
              <Sk className="h-8 w-52 rounded-full" />
              <Sk className="h-8 w-40 rounded-full" />
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Sk className="h-3 w-24" />
                    <Sk className="h-8 w-16" />
                  </div>
                  <Sk className="h-10 w-10 shrink-0 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <Sk className="h-6 w-48" />
                <Sk className="h-4 w-72 max-w-full" />
              </div>
              <Sk className="h-10 w-36 rounded-xl" />
            </div>
            <Sk className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="min-w-0 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-4">
            <div className="mb-4 space-y-2">
              <Sk className="h-6 w-40" />
              <Sk className="h-4 w-56" />
            </div>
            <Sk className="mx-auto h-52 max-w-[220px] rounded-full" />
            <div className="mt-6 space-y-2">
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-4/5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Sk className="h-6 w-56" />
            <Sk className="h-9 w-28 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3"
              >
                <Sk className="h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Sk className="h-4 w-48 max-w-full" />
                  <Sk className="h-3 w-72 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sessions: list rows (banner + filters stay real in Sessions.tsx) */
export function SessionsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading sessions">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Sk className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Sk className="h-5 w-40" />
            <Sk className="h-3 w-56" />
          </div>
        </div>
        <Sk className="h-8 w-28 self-end sm:self-auto" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3.5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <Sk className="mt-1 h-4 w-4 shrink-0 rounded" />
            <Sk className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Sk className="h-5 max-w-xs" />
              <Sk className="h-3 w-full max-w-md" />
              <Sk className="h-3 w-full max-w-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pl-7 sm:justify-end sm:pl-0 lg:w-auto">
            <Sk className="h-6 w-20 rounded-full" />
            <Sk className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Patients: hero + search + table rows */
export function PatientsPageSkeleton() {
  return (
    <div
      className={THERAPIST_PAGE_SHELL}
      role="status"
      aria-busy="true"
      aria-label="Loading patients"
    >
      <div className="relative w-full overflow-hidden rounded-xl bg-[#2f224a]/40 min-h-[10.5rem] sm:h-40">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-400/30 via-gray-300/20 to-gray-400/30" />
        <div className="relative z-10 flex h-full flex-col justify-end p-4 sm:p-6">
          <Sk className="mb-2 h-8 w-56 max-w-[80%] bg-white/30" />
          <Sk className="h-4 w-72 max-w-[90%] bg-white/25" />
        </div>
      </div>

      <div className="mt-5 w-full">
        <Sk className="h-12 w-full rounded-lg" />
      </div>

      <div className="mt-5 w-full space-y-4 pb-8">
        <div className="hidden rounded-lg border border-gray-200 bg-white px-5 py-3 md:grid md:grid-cols-12">
          <Sk className="col-span-4 h-3" />
          <Sk className="col-span-4 h-3" />
          <Sk className="col-span-2 h-3" />
          <Sk className="col-span-2 ml-auto h-3 w-16" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12">
              <div className="md:col-span-4 space-y-3">
                <Sk className="h-6 w-48" />
                <Sk className="h-4 w-32" />
                <Sk className="h-4 w-full max-w-sm" />
              </div>
              <div className="md:col-span-4 space-y-2">
                <Sk className="h-4 w-56" />
                <Sk className="h-3 w-40" />
              </div>
              <div className="md:col-span-2">
                <Sk className="h-4 w-28" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2 md:ml-auto md:max-w-[220px]">
                <Sk className="h-10 w-full rounded-md" />
                <Sk className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Profile: hero strip + form sections */
export function ProfilePageSkeleton() {
  return (
    <div
      className={THERAPIST_PAGE_SHELL}
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="mb-6 overflow-hidden rounded-xl bg-[#2f224a]/40 min-h-[200px]">
        <div className="animate-pulse bg-gradient-to-r from-gray-500/25 via-gray-400/15 to-gray-500/25 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Sk className="h-8 w-36 bg-white/30" />
              <Sk className="h-4 w-64 max-w-full bg-white/25" />
            </div>
            <div className="space-y-2">
              <Sk className="ml-auto h-3 w-32 bg-white/25" />
              <Sk className="h-12 w-44 rounded-lg bg-white/20" />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            <Sk className="h-24 w-24 shrink-0 rounded-xl bg-white/25" />
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <Sk className="h-16 rounded-lg bg-white/20" />
              <Sk className="h-16 rounded-lg bg-white/20" />
              <Sk className="h-16 rounded-lg bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <Sk className="mb-5 h-6 w-56" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Sk className="h-3 w-24" />
                <Sk className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <Sk className="h-3 w-20" />
            <Sk className="h-24 w-full" />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <Sk className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
