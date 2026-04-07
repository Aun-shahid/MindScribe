import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';

const HelpCenter = () => {
  return (
    <div className={THERAPIST_PAGE_SHELL}>
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-xl border border-purple-100 bg-white p-5 shadow-md sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Help Center</h1>
          <p className="mt-2 text-sm text-gray-600">How to use MindScribe and AI-assisted features</p>
        </div>

        <section className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/35 p-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Quick start checklist</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Create therapist profile settings and verify account access.</li>
            <li>Add patients and complete key care profile details.</li>
            <li>Create sessions, collect consent, and begin AI-assisted workflow.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Getting started</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Go to Patients and add a patient profile.</li>
            <li>Create a session from Sessions or from a patient detail page.</li>
            <li>Start an active session to use live recording and AI transcription support.</li>
          </ol>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Using the AI feature</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Ensure patient consent for recording and AI analysis before starting.</li>
            <li>During Active Session, click Start Recording to stream audio for transcription assistance.</li>
            <li>Complete the session and review generated notes before saving final documentation.</li>
            <li>Always validate AI-generated text against your clinical observations.</li>
          </ul>
        </section>

        <section className="grid gap-5 text-sm text-gray-700 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Core pages and their purpose</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Dashboard:</strong> Daily snapshot, activity trends, quick navigation.</li>
              <li><strong>Sessions:</strong> Plan, filter, and bulk manage appointments.</li>
              <li><strong>Patients:</strong> Track care profile and treatment history.</li>
              <li><strong>Tools:</strong> Structured templates and AI-assisted outputs.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Best-practice AI workflow</h2>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Capture clear audio in a low-noise environment.</li>
              <li>Pause/resume recording intentionally during session transitions.</li>
              <li>Review generated notes before finalizing records.</li>
              <li>Use AI text as draft support, not final clinical truth.</li>
            </ol>
          </div>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Recommended workflow</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Use Dashboard for a high-level view of sessions and notifications.</li>
            <li>Use Sessions to organize upcoming visits and bulk updates.</li>
            <li>Use Patient Detail for care context, trends, and history review.</li>
            <li>Use Tools for SOAP and emotional profile support.</li>
          </ol>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Troubleshooting</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>If transcription seems delayed, check microphone permission and network stability.</li>
            <li>If session start fails, verify patient assignment and scheduled time validity.</li>
            <li>If data appears stale, use refresh controls and confirm filter settings.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpCenter;
