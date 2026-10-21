export const metadata = { title: "Terms of use" };
export default function Page() {
  return (
    <article className="shell pt-16 max-w-4xl! leading-8">
      <p className="eyebrow">CREATE WITH CARE</p>
      <h1 className="page-title">Terms of use.</h1>
      <p className="muted">
        Effective October 21, 2026. These terms need operator and legal review
        before a public launch.
      </p>
      <h2 className="text-xl mt-8">Rights and responsibilities</h2>
      <p>
        Upload only images you own or have permission to process. Do not upload
        unlawful, exploitative, abusive, intimate non-consensual or otherwise
        prohibited material. Private uploads do not grant the operator
        permission to publish them. Administrator publication requires a
        separate rights confirmation.
      </p>
      <h2 className="text-xl mt-8">Wallpaper licenses</h2>
      <p>
        Each wallpaper lists its creator, source and license. Follow that
        license, including attribution and ShareAlike requirements when
        applicable. Resizing, cropping and color changes may create adaptations.
        Copyright permission does not necessarily clear personality rights,
        trademarks, privacy rights or endorsements.
      </p>
      <h2 className="text-xl mt-8">Processing and availability</h2>
      <p>
        AI upscaling is optional and may be unavailable. Resized images are
        labeled separately from AI-enhanced images. No process guarantees
        recovery of missing detail. Upload limits, rate limits and 24-hour
        retention apply. Keep copies of images you need. This service is
        provided as available.
      </p>
      <h2 className="text-xl mt-8">Reports and enforcement</h2>
      <p>
        The operator may remove content and restrict access to address abuse or
        rights complaints. Use Copyright & removal to submit a report with
        enough detail to identify the affected image and explain your concern.
      </p>
    </article>
  );
}
