import { legal } from "@/lib/legal/config";

const e = legal.entityName;
const contact = legal.contactEmail;
const address = legal.address;

export function TermsContent() {
  return (
    <>
      <h2>Agreement</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of hudxyz.com, operated by {e}{" "}
        (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using the service — including the Meta
        Ray-Ban Display simulator, the public Hub Directory, and the hub submission flow — you agree
        to these Terms. If you do not agree, do not use hudxyz.com.
      </p>
      <p>
        There are no general user accounts in the current version. Visiting or using the service
        constitutes acceptance of these Terms. Submitting a hub for review also requires an explicit
        acceptance of the then-current Terms version at submission time.
      </p>

      <h2>The service</h2>
      <p>hudxyz.com provides:</p>
      <ul>
        <li>
          A browser-based simulator for previewing web content in a Meta Ray-Ban Display–compatible
          viewport, including a same-origin proxy so third-party pages can be framed and driven with
          D-pad input
        </li>
        <li>
          A public Hub Directory of developer and studio hubs, including search over published hubs
        </li>
        <li>
          A submission flow for developers to draft, upload a logo, and submit a hub for editorial
          review
        </li>
      </ul>
      <p>
        Simulator traffic may egress through infrastructure we operate rather than directly from
        your browser. Third-party sites loaded in the simulator are not owned, operated, or endorsed
        by us.
      </p>
      <p>We may change, suspend, or discontinue any part of the service at any time.</p>

      <h2>Eligibility and authority to submit</h2>
      <p>
        You may submit a hub only if you are at least 18 (or the age of majority where you live) and
        have authority to grant the rights in these Terms for the hub, metadata, and logo you
        provide. If you submit on behalf of an organisation, you represent that you are authorised
        to bind that organisation.
      </p>

      <h2>Hub submissions</h2>
      <p>
        When you submit a hub, you retain ownership of your brand assets and original content. You
        grant {e} a worldwide, non-exclusive, royalty-free licence to host, reproduce, resize,
        cache, display, distribute, and promote the hub metadata and logo in connection with
        operating, showcasing, and marketing the hudxyz.com Hub Directory and simulator.
      </p>
      <p>You represent and warrant that:</p>
      <ul>
        <li>The information you provide is accurate and not misleading</li>
        <li>
          You own or have all rights needed for the name, homepage, launch URL, description,
          branding, logo, and any third-party material included
        </li>
        <li>
          The hub and linked sites do not infringe intellectual property, privacy, publicity, or
          other rights; do not contain malware or harmful code; and do not violate applicable law
        </li>
        <li>
          The launch URL is reasonably suitable for the stated target device and does not primarily
          promote illegal, abusive, or deceptive activity
        </li>
      </ul>
      <p>
        Contact email collected at submission is private and used for review and operational
        communication about that hub. It is not shown on public directory pages.
      </p>

      <h2>Editorial review and hub standards</h2>
      <p>
        Submissions are reviewed before publication (including via our internal Padme review tools).
        We may edit metadata for clarity or safety, reject, correct, suspend, unpublish, or remove
        hubs at our discretion — including for quality, safety, legal risk, trademark conflict,
        inactivity, or breach of these Terms. Publication does not create an endorsement or
        partnership.
      </p>

      <h2>Third-party hubs and content</h2>
      <p>
        Directory hubs and simulator targets are third-party products maintained by their developers
        or studios. We do not operate those sites, do not guarantee their availability or safety,
        and are not responsible for their content, privacy practices, or terms. You should review
        what you open in the simulator. You interact with third-party content at your own risk. The
        simulator is a development and preview tool, not a general-purpose anonymous browser.
      </p>

      <h2>Acceptable use</h2>
      <p>You must use hudxyz.com lawfully and must not:</p>
      <ul>
        <li>Break the law or facilitate illegal content</li>
        <li>Attack, probe, or access systems you are not authorised to use</li>
        <li>
          Abuse the service (for example, excessive automated requests, denial-of-service, malware,
          or circumventing blocks)
        </li>
        <li>Impersonate others, commit fraud, harass others, or phish</li>
        <li>
          Submit hubs you do not have rights to, or use the directory to distribute malware or
          deceptive software
        </li>
      </ul>
      <p>We may block URLs, addresses, hubs, or usage patterns at our discretion.</p>

      <h2>Intellectual property and takedowns</h2>
      <p>
        If you believe a hub or content on hudxyz.com infringes your rights, contact{" "}
        <a href={`mailto:${contact}`}>{contact}</a> with enough detail for us to identify the
        material and respond. We may remove or disable access to content while we investigate.
      </p>

      <h2>Trademarks</h2>
      <p>
        hudxyz.com is operated by {e}. We are not affiliated with, endorsed by, or sponsored by Meta
        Platforms, Inc., EssilorLuxottica S.A., Luxottica Group S.p.A., or their affiliates.
      </p>
      <p>
        Meta, Ray-Ban, and Meta Ray-Ban Display are trademarks of their respective owners. We use
        those names only to describe compatibility with the Meta Ray-Ban Display. hudxyz.com is an
        independent developer tool and directory, not an official Meta or Ray-Ban product.
      </p>

      <h2>Privacy</h2>
      <p>
        Our handling of personal information is described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Disclaimers</h2>
      <p>
        hudxyz.com is provided &quot;as is&quot; and &quot;as available&quot;. We do not warrant
        uninterrupted, error-free, or secure operation; that any particular site or hub will load
        correctly; or that directory content is complete, current, or fit for a particular purpose.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential loss, or
        loss of profits or data. Our liability for any claim arising from the service is limited to
        the maximum extent permitted by applicable law.
      </p>
      <p>
        Nothing in these Terms excludes rights or remedies under the Australian Consumer Law that
        cannot lawfully be excluded.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify us against claims arising from your use of the service, your
        submissions, your breach of these Terms, or infringement of third-party rights, except where
        caused by our misconduct or liability that cannot be excluded under the Australian Consumer
        Law.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access, remove hubs, or refuse submissions if you breach these
        Terms, pose a security or legal risk, or if we discontinue the service.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of Queensland and Australia. You submit to the
        non-exclusive jurisdiction of courts in Queensland and the Commonwealth of Australia.
      </p>

      <h2>Contact</h2>
      <p>
        {e}
        <br />
        {address}
        <br />
        <a href={`mailto:${contact}`}>{contact}</a>
      </p>
    </>
  );
}
