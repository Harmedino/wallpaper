export const metadata = { title: "Privacy policy" };
export default function Page() {
  return (
    <article className="shell pt-16 max-w-4xl! leading-8">
      <p className="eyebrow">YOUR SPACE, RESPECTED</p>
      <h1 className="page-title">Privacy policy.</h1>
      <p className="muted">
        Effective October 21, 2026. Review and adapt this policy with your legal
        adviser before a public launch.
      </p>
      <h2 className="text-xl mt-8">Your images</h2>
      <p>
        Uploaded images and generated results are private to your signed browser
        session. They are not automatically published. Images are decoded and
        re-encoded to remove EXIF location metadata. Uploads expire after 24
        hours; the background worker removes expired files. Administrators
        operating this service can access stored data for security, maintenance
        and abuse investigations.
      </p>
      <h2 className="text-xl mt-8">Processing providers</h2>
      <p>
        If you request AI enhancement and an external provider is configured,
        your image is sent to that provider for processing. The provider’s
        retention and privacy terms also apply. Standard cropping, resizing and
        color adjustment run on our own server.
      </p>
      <h2 className="text-xl mt-8">Cookies and records</h2>
      <p>
        A necessary, HttpOnly session cookie protects your private uploads. We
        store processing job status, download counts, administrator review
        decisions, rate-limit counters and submitted copyright reports. Clearing
        the cookie removes your access to existing private images. No
        advertising or analytics trackers are included in this application.
      </p>
      <h2 className="text-xl mt-8">Deletion and contact</h2>
      <p>
        Use My uploads to delete your images and results. Processing jobs must
        finish before deletion. Contact the operator through the Copyright &
        removal form for privacy inquiries. Report details are available to
        administrators; do not include sensitive information beyond what is
        necessary.
      </p>
    </article>
  );
}
