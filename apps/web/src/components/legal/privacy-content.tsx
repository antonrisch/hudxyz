import { legal } from "@/lib/legal/config";

const e = legal.entityName;
const contact = legal.contactEmail;
const address = legal.address;

export function PrivacyContent() {
  return (
    <>
      <h2>Who we are</h2>
      <p>
        {e} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates hudxyz.com, a browser-based
        simulator designed for compatibility with the Meta Ray-Ban Display. We are based in
        Queensland, Australia.
      </p>
      <p>
        Contact: <a href={`mailto:${contact}`}>{contact}</a>
        <br />
        {address}
      </p>

      <h2>What hudxyz.com does</h2>
      <p>
        You can enter a URL to load a public website in the simulator. Requests may be routed
        through proxy infrastructure we operate so the page can be displayed. We do not operate or
        control third-party sites you choose to load.
      </p>
      <p>hudxyz.com does not offer user accounts. You can use the service without registering.</p>

      <h2>What we collect</h2>
      <p>We collect limited personal information, mainly:</p>
      <ul>
        <li>URLs you enter or follow via share links</li>
        <li>Technical data such as IP address, browser type, timestamps, and pages requested</li>
        <li>
          Error reports, performance data, and session recordings via Sentry (we may record sessions
          when errors occur)
        </li>
        <li>Aggregated usage metrics via Vercel Analytics</li>
        <li>
          Connection logs on our proxy servers (for example, when a request is allowed or refused)
        </li>
      </ul>
      <p>
        Session replay may capture interactions on hudxyz.com itself, such as text entered in the
        address bar. It does not give us control over data handled by third-party sites inside the
        simulator.
      </p>
      <p>
        We do not intentionally collect payment details or account credentials. We do not sell
        personal information.
      </p>
      <p>
        We do not use non-essential cookies in v1. Third-party sites you load in the simulator may
        set their own cookies. Our service providers may use cookies or similar technologies as part
        of their services.
      </p>

      <h2>Why we use it</h2>
      <p>
        To run the simulator, process URLs you submit, keep the service reliable, diagnose errors,
        prevent abuse, understand usage, and meet legal obligations.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We use service providers that may process personal information on our behalf, including
        Vercel (hosting and analytics, United States) and Sentry (error monitoring, United States).
        Personal information may be stored and processed outside Australia, including in the United
        States. Overseas recipients may be subject to foreign laws.
      </p>
      <p>We may also disclose information where required or permitted by law.</p>

      <h2>Your rights</h2>
      <p>
        Under the Australian Privacy Act, you may request access to or correction of personal
        information we hold about you. Because there are no accounts, we may need details such as
        when you used the service to locate records.
      </p>
      <p>
        Contact <a href={`mailto:${contact}`}>{contact}</a>. If you are not satisfied, you may
        complain to the{" "}
        <a href="https://www.oaic.gov.au" rel="noopener noreferrer">
          OAIC
        </a>
        .
      </p>

      <h2>Children</h2>
      <p>
        hudxyz.com is not directed at children under 13. We do not knowingly collect personal
        information from children.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The date at the top of this page shows when it
        was last revised.
      </p>
    </>
  );
}
