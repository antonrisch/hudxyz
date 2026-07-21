import { legal } from "@/lib/legal/config";

const e = legal.entityName;
const contact = legal.contactEmail;
const address = legal.address;

export function PrivacyContent() {
  return (
    <>
      <h2>Who we are</h2>
      <p>
        {e} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates hudxyz.com — a browser-based
        Meta Ray-Ban Display simulator, a public Hub Directory, and a submission flow for developer
        and studio hubs. We are based in Queensland, Australia.
      </p>
      <p>
        Contact: <a href={`mailto:${contact}`}>{contact}</a>
        <br />
        {address}
      </p>

      <h2>What hudxyz.com does</h2>
      <p>
        You can browse published hubs, open a hub&apos;s launch URL in the simulator or via device
        deep links, enter a URL to load a public website in the simulator, and submit a new hub for
        review. Simulator requests may be routed through proxy infrastructure we operate so the page
        can be displayed and controlled with D-pad input. We do not operate or control third-party
        sites or hubs you choose to load or list. Developers maintain their own hubs; you should
        review what you open in the simulator.
      </p>
      <p>
        hudxyz.com does not offer general user accounts in the current version. You can browse and
        use the simulator without registering. Draft submissions are protected with a per-draft edit
        capability (HttpOnly cookie) rather than a full account.
      </p>

      <h2>What we collect</h2>
      <p>We collect limited personal and operational information, mainly:</p>
      <ul>
        <li>
          <strong>Public hub data</strong> you choose to publish or that we publish after review:
          name, homepage, launch URL, optional description, and logo
        </li>
        <li>
          <strong>Private submission data</strong>: contact email (review/operations only; not shown
          on public directory pages), draft/review status, reviewer notes, and Terms acceptance
          version/timestamp when you submit for review
        </li>
        <li>Logo objects stored in object storage for drafts and published hubs</li>
        <li>
          Technical data such as IP address, browser type, timestamps, pages requested, and proxy or
          security logs (for example allow/deny decisions on the simulator egress host)
        </li>
        <li>
          Error reports, performance data, and session recordings via Sentry. Replay is configured
          to mask text/inputs and block media; we still treat submit-form content as sensitive
        </li>
        <li>
          Aggregated usage metrics via Vercel Analytics (page views) during a temporary overlap with
          PostHog
        </li>
        <li>
          Product analytics via PostHog: page paths, referrers, and explicit interaction events (for
          example opening a hub, loading the simulator, or completing a submission). We do not send
          search query text, simulator target URLs, contact emails, or draft form contents to
          PostHog. URLs are stripped to origin + pathname before capture
        </li>
        <li>
          Consent preferences via c15t / inth (necessary + measurement categories). When you grant
          measurement consent, PostHog may use persistent cookies for a stable identity; when you
          decline, PostHog continues in cookieless mode with a daily rotating server-side hash
        </li>
      </ul>
      <p>
        We do not intentionally collect payment details or account credentials. We do not sell
        personal information.
      </p>

      <h2>Cookies and similar technologies</h2>
      <p>We use:</p>
      <ul>
        <li>
          <strong>Necessary</strong> cookies for consent storage (c15t), submit-session protection,
          per-draft edit capability, simulator chrome preferences, and internal review unlock
        </li>
        <li>
          <strong>Measurement</strong> cookies only after consent where required (or until you opt
          out where opt-out rules apply): PostHog persistent identity for consenting visitors
        </li>
      </ul>
      <p>
        We do not use a marketing cookie category. You can reopen preferences anytime via Privacy
        settings in the site footer. Third-party sites you load in the simulator may set their own
        cookies.
      </p>

      <h2>Why we use it</h2>
      <p>
        To operate the simulator and Hub Directory, process submissions and logo uploads, review and
        publish hubs, keep the service reliable, diagnose errors, prevent abuse, understand product
        usage and conversion funnels, honour consent choices, and meet legal obligations.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We use service providers that process information on our behalf. Roles include: Vercel
        (hosting and temporary web analytics), PostHog (product analytics), Sentry (error monitoring
        and session replay), Turso (application database for hubs and review metadata), Cloudflare
        R2 (logo object storage), and c15t / inth (consent management). Personal information may be
        stored and processed outside Australia. Overseas recipients may be subject to foreign laws.
        We do not claim a specific hosting country for each provider beyond what their own
        documentation states for the regions we configure.
      </p>
      <p>We may also disclose information where required or permitted by law.</p>

      <h2>Retention and removal</h2>
      <p>
        Drafts, pending submissions, published hubs, and logos are retained while needed to operate
        the directory and review process. You may request removal or correction of a hub or personal
        information by contacting us. Proxy and security logs are retained for operational and
        abuse-prevention periods. Analytics events follow the retention settings of the analytics
        providers we use.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Australian Privacy Act, you may request access to or correction of personal
        information we hold about you. Because there are no general accounts, we may need details
        such as contact email, public hub id, or when you used the service to locate records.
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
        was last revised. Material Terms changes used for submission acceptance are versioned
        separately so existing acceptance records stay stable.
      </p>
    </>
  );
}
