import { legal } from "@/lib/legal/config";

const e = legal.entityName;
const contact = legal.contactEmail;
const address = legal.address;

export function TermsContent() {
  return (
    <>
      <h2>Agreement</h2>
      <p>
        These Terms govern your use of hud.xyz, operated by {e}. By using the service, you agree to
        these Terms. If you do not agree, do not use hud.xyz.
      </p>
      <p>There are no user accounts. Use of the service constitutes acceptance.</p>

      <h2>The service</h2>
      <p>
        hud.xyz lets you load public websites in an emulator viewport. Traffic may egress through
        infrastructure we operate rather than directly from your browser. Third-party sites are not
        owned, operated, or endorsed by us.
      </p>
      <p>We may change, suspend, or discontinue any part of the service at any time.</p>

      <h2>Acceptable use</h2>
      <p>hud.xyz includes an open web proxy. You must use it lawfully and must not:</p>
      <ul>
        <li>Break the law or facilitate illegal content</li>
        <li>Attack, probe, or access systems you are not authorised to use</li>
        <li>
          Abuse the service (for example, excessive automated requests, denial-of-service, malware,
          or circumventing blocks)
        </li>
        <li>Impersonate others, commit fraud, harass others, or phish</li>
      </ul>
      <p>We may block URLs, addresses, or usage patterns at our discretion.</p>

      <h2>Third-party content</h2>
      <p>
        You load third-party websites at your own direction. We do not review or control that
        content and do not endorse it. Third-party sites may log requests from our infrastructure.
        The emulator is a development and preview tool, not a general-purpose anonymous browser.
      </p>

      <h2>Trademarks</h2>
      <p>
        hud.xyz is operated by {e}. We are not affiliated with, endorsed by, or sponsored by Meta
        Platforms, Inc., EssilorLuxottica S.A., Luxottica Group S.p.A., or their affiliates.
      </p>
      <p>
        Meta, Ray-Ban, and Meta Ray-Ban Display are trademarks of their respective owners. We use
        those names only to describe compatibility with the Meta Ray-Ban Display. hud.xyz is an
        independent developer tool, not an official Meta or Ray-Ban product.
      </p>

      <h2>Privacy</h2>
      <p>
        Our handling of personal information is described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Liability</h2>
      <p>
        hud.xyz is provided &quot;as is&quot; and &quot;as available&quot;. We do not warrant
        uninterrupted, error-free, or secure operation, or that any particular site will load
        correctly.
      </p>
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
        You agree to indemnify us against claims arising from your use of the service, your breach
        of these Terms, or infringement of third-party rights, except where caused by our misconduct
        or liability that cannot be excluded under the Australian Consumer Law.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access if you breach these Terms, pose a security or legal risk,
        or if we discontinue the service.
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
