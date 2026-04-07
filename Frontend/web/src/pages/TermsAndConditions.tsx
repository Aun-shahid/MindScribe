import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';

const TermsAndConditions = () => {
  return (
    <div className={THERAPIST_PAGE_SHELL}>
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-xl border border-purple-100 bg-white p-5 shadow-md sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Terms & Conditions</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: April 7, 2026</p>
        </div>

        <section className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/35 p-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Important notice</h2>
          <p>
            MindScribe provides assistive tools for therapists and clinics. It is not a substitute for emergency medical
            care, diagnosis authority, or clinician judgment.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Use of service</h2>
          <p>
            MindScribe is provided for professional therapeutic workflow support. You agree to use the platform only for
            lawful clinical operations and in accordance with patient privacy obligations.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Clinical responsibility</h2>
          <p>
            AI features are assistive only and do not replace clinical judgment. Final treatment decisions, diagnoses,
            and documentation approval remain the sole responsibility of the licensed practitioner.
          </p>
        </section>

        <section className="grid gap-5 text-sm text-gray-700 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Acceptable use</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Use only for authorized therapeutic and clinic operations.</li>
              <li>Do not misuse the platform for unlawful or non-clinical exploitation.</li>
              <li>Do not attempt to bypass security or access unauthorized accounts.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Prohibited use</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Entering fabricated patient records or false claims.</li>
              <li>Using AI outputs as final clinical conclusions without review.</li>
              <li>Exporting or sharing protected data without legal authorization.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Data and consent</h2>
          <p>
            You must obtain all required patient consents before enabling recording or AI analysis. You are responsible
            for ensuring compliance with applicable healthcare, privacy, and data-protection laws in your jurisdiction.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">AI outputs and limitations</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>AI-generated notes/transcripts may contain errors and omissions.</li>
            <li>Users must review, edit, and approve outputs before clinical reliance.</li>
            <li>MindScribe does not guarantee diagnostic completeness from AI content.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Account and security</h2>
          <p>
            Keep your account credentials secure and report unauthorized access promptly. You are responsible for
            activities performed through your account.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Service updates and termination</h2>
          <p>
            We may update features, policies, and controls to improve safety and compliance. Accounts may be suspended
            for material policy violations, security concerns, or misuse.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
