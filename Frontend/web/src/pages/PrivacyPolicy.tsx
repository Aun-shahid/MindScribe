import { THERAPIST_PAGE_SHELL } from '../constants/pageShell';

const PrivacyPolicy = () => {
  return (
    <div className={THERAPIST_PAGE_SHELL}>
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-xl border border-purple-100 bg-white p-5 shadow-md sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: April 7, 2026</p>
        </div>

        <section className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/35 p-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Summary commitment</h2>
          <p>
            MindScribe is built around data minimization in clinical workflows. We do not use your data for advertising,
            and we do not intentionally retain patient-sensitive content longer than needed for the active care workflow
            and legally required operations.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Our privacy approach</h2>
          <p>
            MindScribe is designed to minimize storage of sensitive personal and medical information. We process session
            workflows to provide therapist tools, and we avoid retaining patient-sensitive data longer than required for
            the active product flow and legal obligations.
          </p>
        </section>

        <section className="grid gap-5 text-sm text-gray-700 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">What we may process</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account identity data (name, email, role, clinic metadata).</li>
              <li>Session workflow data (scheduling, timing, status, and therapist notes).</li>
              <li>AI operation metadata needed to generate and return outputs.</li>
              <li>Security and audit logs to protect platform integrity.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">What we avoid storing</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Unnecessary copies of patient-sensitive text/audio after processing.</li>
              <li>Persistent data unrelated to treatment operations.</li>
              <li>Sensitive fields outside approved user workflows and consent.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Patient and sensitive data handling</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We do not intentionally keep unnecessary sensitive data after it has served its immediate use.</li>
            <li>Session artifacts are removed or de-identified according to configured retention practices.</li>
            <li>Access to patient-related data is limited to authorized clinical users.</li>
            <li>Security controls are applied in transit and at rest where data processing is required.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Retention and deletion model</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Operational data is retained only for required continuity, support, and compliance windows.</li>
            <li>AI intermediate artifacts are treated as temporary processing data.</li>
            <li>Deletion/anonymization routines are applied based on product configuration and legal constraints.</li>
            <li>Clinics can request account-level closure and data lifecycle review.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Medical compliance principles</h2>
          <p>
            The platform is operated with healthcare privacy and confidentiality principles in mind, including least
            privilege, data minimization, and controlled disclosure. Clinics remain responsible for local regulatory
            compliance and patient consent workflows.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Your responsibilities</h2>
          <p>
            Therapists and clinics must only upload or enter information necessary for care delivery and must obtain
            required patient consent before recording or AI-assisted processing.
          </p>
        </section>

        <section className="space-y-2 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Contact and policy updates</h2>
          <p>
            This policy can be updated as regulations and product controls evolve. Material updates will be reflected by
            the “Last updated” date and communicated through app notices when appropriate.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
