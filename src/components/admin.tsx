"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { categories } from "@/lib/constants";
import Link from "next/link";
import { LockKeyhole, RefreshCw, ArrowUpRight, Check, X } from "lucide-react";
async function api(path: string, body?: unknown) {
  const r = await fetch(
    "/api/" + path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
export function Admin() {
  const [data, setData] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [auth, setAuth] = useState(false);
  const [source, setSource] = useState("commons");
  const [query, setQuery] = useState("landscape");
  const [intervalHours, setInterval] = useState(24);
  const [enabled, setEnabled] = useState(false);
  const [uploadId, setUploadId] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [license, setLicense] = useState("cc0");
  const [sourceUrl, setSourceUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState(
    "https://creativecommons.org/publicdomain/zero/1.0/",
  );
  const [rights, setRights] = useState(false);
  async function load() {
    try {
      const d = await api("admin");
      setData(d);
      setAuth(true);
    } catch (e) {
      if (auth)
        setError(e instanceof Error ? e.message : "Unable to load dashboard");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function act(fn: () => Promise<any>, message = "Saved.") {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await fn();
      setMessage(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    await act(async () => {
      await api("login", { password });
      setPassword("");
      await load();
    }, "Signed in.");
  }
  if (!auth)
    return (
      <div className="shell pt-20">
        <form onSubmit={login} className="panel max-w-md mx-auto">
          <LockKeyhole className="text-teal-300 mb-5" />
          <p className="eyebrow">ADMINISTRATOR ACCESS</p>
          <h1 className="text-3xl mb-4">Behind the collection.</h1>
          <p className="muted text-sm leading-6">
            Use the administrator password configured for this deployment. No
            default password is provided.
          </p>
          <label className="field mt-6">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button className="w-full mt-5" disabled={busy}>
            Sign in
          </Button>
          {error && (
            <p className="error mt-5" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    );
  return (
    <div className="shell pt-12">
      <div className="flex justify-between items-center gap-4">
        <div>
          <p className="eyebrow">THE CURATOR'S DESK</p>
          <h1 className="page-title">Your collection, considered.</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => act(load, "Dashboard refreshed.")}
          disabled={busy}
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 my-7">
        {[
          "overview",
          "review",
          "wallpapers",
          "sources",
          "publish",
          "jobs",
          "limits",
          "reports",
        ].map((t) => (
          <button
            className={"chip " + (tab === t ? "active" : "")}
            key={t}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          className="chip"
          onClick={async () => {
            await fetch("/api/session", { method: "DELETE" });
            setAuth(false);
            setData(null);
          }}
        >
          Sign out
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="notice">{message}</p>}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <>
          {tab === "overview" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  [
                    "Published wallpapers",
                    data.wallpapers.filter((w: any) => w.published).length,
                  ],
                  ["Total downloads", data.downloads],
                  ["Awaiting review", data.candidates.length],
                  ["Private uploads", data.uploads],
                ].map(([label, v]) => (
                  <div className="panel" key={label}>
                    <p className="muted text-xs">{label}</p>
                    <span className="text-4xl">{v}</span>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-5 mt-6">
                <div className="panel">
                  <h2 className="text-lg">Most downloaded</h2>
                  {data.wallpapers.slice(0, 5).map((w: any) => (
                    <p key={w.id} className="flex justify-between text-sm py-2">
                      <Link href={`/wallpaper/${w.id}`}>{w.title}</Link>
                      <span className="muted">{w.downloads}</span>
                    </p>
                  ))}
                </div>
                <div className="panel">
                  <h2 className="text-lg">Processing & storage</h2>
                  <p className="text-sm muted leading-7">
                    Storage backend: {data.storage}
                    <br />
                    AI provider: {data.aiProvider}
                    <br />
                    Upload limit: {data.limits.uploadMb} MB
                    <br />
                    Output limit: {data.limits.outputMegapixels} MP
                    <br />
                    Private retention: {data.limits.retentionHours} hours
                    <br />
                    Per-session uploads: {data.limits.uploadsPerHour}/hour
                  </p>
                  <p className="text-xs muted">
                    Storage:{" "}
                    {data.storageUsage
                      ? `${(data.storageUsage.bytes / 1024 / 1024).toFixed(1)} MB across ${data.storageUsage.objects} objects`
                      : "Usage unavailable"}
                    . Worker last seen:{" "}
                    {data.workerHeartbeat?.at
                      ? new Date(data.workerHeartbeat.at).toLocaleString()
                      : "Not yet observed"}
                    . Actual AI billing is available in your provider dashboard.
                  </p>
                </div>
              </div>
              <div className="panel mt-5">
                <h2 className="text-lg">Popular categories</h2>
                {Array.from(
                  new Set(data.wallpapers.map((w: any) => w.category)),
                ).map((c: any) => (
                  <p className="text-sm muted" key={c}>
                    {c}:{" "}
                    {data.wallpapers
                      .filter((w: any) => w.category === c)
                      .reduce((s: number, w: any) => s + w.downloads, 0)}{" "}
                    downloads
                  </p>
                ))}
              </div>
            </>
          )}
          {tab === "review" && (
            <>
              <p className="muted text-sm mb-6">
                Candidates are metadata only. Approval downloads and publishes
                the image. Verify the source page, creator, license,
                attribution, trademarks and personality rights. NASA candidates
                require individual media-guideline review; NASA branding or
                third-party credits can make an image ineligible.
              </p>
              {!data.candidates.length ? (
                <div className="panel">
                  No pending images. Discover candidates in Sources.
                </div>
              ) : (
                data.candidates.map((c: any) => (
                  <Candidate key={c.id} c={c} busy={busy} act={act} />
                ))
              )}
            </>
          )}
          {tab === "wallpapers" && (
            <div className="space-y-5">
              {data.wallpapers.map((w: any) => (
                <EditWallpaper key={w.id} w={w} busy={busy} act={act} />
              ))}
            </div>
          )}
          {tab === "sources" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="panel">
                <h2 className="text-xl">Responsible discovery</h2>
                <div className="field space-y-3">
                  <label>
                    Provider
                    <select
                      className="w-full mt-2"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value);
                        const s = data.sources.find(
                          (s: any) => s.id === e.target.value,
                        );
                        setQuery(s?.query || "landscape");
                        setEnabled(s?.enabled || false);
                        setInterval(s?.intervalHours || 24);
                      }}
                    >
                      <option value="commons">Wikimedia Commons</option>
                      <option value="openverse">Openverse</option>
                      <option value="nasa">NASA Image Library</option>
                    </select>
                  </label>
                  <label>
                    Search query
                    <input
                      className="w-full mt-2"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Schedule interval (hours)
                    <input
                      className="w-full mt-2"
                      type="number"
                      min="6"
                      max="720"
                      value={intervalHours}
                      onChange={(e) => setInterval(+e.target.value)}
                    />
                  </label>
                  <label className="flex gap-3 items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    Enable scheduled discovery in worker
                  </label>
                </div>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      act(() =>
                        api("admin/sources", {
                          id: source,
                          query,
                          enabled,
                          intervalHours,
                        }),
                      )
                    }
                  >
                    Save schedule
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => api("admin/discover", { id: source, query }),
                        "Discovery completed. Check the review queue.",
                      )
                    }
                  >
                    Discover now
                  </Button>
                </div>
                <p className="text-xs muted leading-6 mt-5">
                  Imports are limited per request. No automatic publication.
                  Openverse originals on hosts outside the approved fetch list
                  are excluded; extend IMAGE_ALLOWED_HOSTS only after checking
                  the host and its terms.
                </p>
              </div>
              <div className="space-y-4">
                {data.sources.map((s: any) => (
                  <div className="panel" key={s.id}>
                    <h3>{s.id}</h3>
                    <p className="text-xs muted">
                      {s.enabled ? "Scheduled" : "Manual only"} ·{" "}
                      {s.intervalHours}h · {s.query}
                      <br />
                      Last run:{" "}
                      {s.lastRunAt
                        ? new Date(s.lastRunAt).toLocaleString()
                        : "Never"}
                    </p>
                    {s.lastError && (
                      <p className="error text-xs">{s.lastError}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "publish" && (
            <div className="panel max-w-2xl">
              <h2 className="text-xl">Publish an original upload</h2>
              <p className="text-sm muted">
                First upload your original in the{" "}
                <Link className="text-teal-200" href="/studio">
                  Studio
                </Link>{" "}
                while signed in here. Copy its upload ID from{" "}
                <Link className="text-teal-200" href="/uploads">
                  My uploads
                </Link>
                . Only your own private uploads can be published.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(
                    () =>
                      api("admin/publish-upload", {
                        uploadId,
                        title,
                        creator,
                        category,
                        license,
                        sourceUrl,
                        licenseUrl,
                        rightsConfirmed: rights,
                      }),
                    "Wallpaper published.",
                  );
                }}
                className="grid sm:grid-cols-2 gap-4 mt-6"
              >
                {[
                  ["Upload ID", uploadId, setUploadId],
                  ["Title", title, setTitle],
                  ["Creator", creator, setCreator],
                  ["Source URL", sourceUrl, setSourceUrl],
                  ["License URL", licenseUrl, setLicenseUrl],
                ].map(([l, v, set]) => (
                  <label className="field" key={String(l)}>
                    {String(l)}
                    <input
                      required
                      value={String(v)}
                      onChange={(e) =>
                        (set as (v: string) => void)(e.target.value)
                      }
                    />
                  </label>
                ))}
                <label className="field">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  License
                  <select
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  >
                    {["cc0", "cc-by-4.0", "cc-by-sa-4.0", "public-domain"].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="flex gap-3 items-center text-xs">
                  <input
                    type="checkbox"
                    checked={rights}
                    required
                    onChange={(e) => setRights(e.target.checked)}
                  />
                  I verified redistribution rights, attribution and
                  non-copyright restrictions.
                </label>
                <Button disabled={busy || !rights}>Publish wallpaper</Button>
              </form>
            </div>
          )}
          {tab === "jobs" && (
            <div className="space-y-3">
              <p className="muted text-sm">
                The separate Node.js worker claims jobs atomically, retries
                failures up to three times, and cleans up expired private media.
              </p>
              {!data.jobs.length ? (
                <div className="panel">No processing jobs yet.</div>
              ) : (
                data.jobs.map((j: any) => (
                  <div className="panel" key={j.id}>
                    <div className="flex justify-between">
                      <span className="text-xs muted break-all">{j.id}</span>
                      <span className="chip">
                        {j.status} · {j.progress}%
                      </span>
                    </div>
                    <p className="text-sm mt-3 mb-0">
                      {j.options.width} × {j.options.height} ·{" "}
                      {j.options.format} · attempt {j.attempts}/3 ·{" "}
                      {j.aiStatus || "Pending result"}
                    </p>
                    {j.error && <p className="error mt-3 text-xs">{j.error}</p>}
                    {j.status === "completed" && j.wallpaperId && (
                      <div className="flex gap-3 mt-4">
                        <a
                          className="text-teal-200 text-xs p-2"
                          href={`/api/jobs/${j.id}/result`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Inspect result
                        </a>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(
                              () => api("admin/apply-result", { jobId: j.id }),
                              "Enhanced result applied; old cached variants cleared.",
                            )
                          }
                        >
                          Approve result as original
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "limits" && (
            <Limits current={data.limits} busy={busy} act={act} />
          )}
          {tab === "reports" && (
            <div className="space-y-4">
              {!data.reports.length ? (
                <div className="panel">No copyright or content reports.</div>
              ) : (
                data.reports.map((r: any) => (
                  <div className="panel" key={r.id}>
                    <p className="text-xs muted">
                      {r.email} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm break-all">{r.url}</p>
                    <p className="text-sm whitespace-pre-wrap">{r.reason}</p>
                    <p className="text-xs muted">
                      Investigate this report and unpublish the affected image
                      from Wallpapers when appropriate.
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function Candidate({
  c,
  busy,
  act,
}: {
  c: any;
  busy: boolean;
  act: (fn: () => Promise<any>, message?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [rights, setRights] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  return (
    <div className="panel mb-5">
      <p className="eyebrow">
        {c.sourceId} · {c.license}
      </p>
      <h2 className="text-xl">{c.title}</h2>
      <p className="muted text-sm">
        {c.creator} · {c.width || "unknown"} × {c.height || "unknown"}
      </p>
      <a
        className="text-teal-200 text-sm"
        target="_blank"
        rel="noreferrer"
        href={c.sourceUrl}
      >
        Inspect original and rights{" "}
        <ArrowUpRight size={13} className="inline" />
      </a>
      <pre className="text-xs muted whitespace-pre-wrap mt-4">
        {JSON.stringify(c.metadata, null, 2)}
      </pre>
      <div className="grid sm:grid-cols-2 gap-4 my-4">
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Review notes (required)
          <textarea
            minLength={10}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record rights checks and any content concerns…"
          />
        </label>
      </div>
      <label className="flex items-center gap-3 text-xs mb-5">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />
        I verified redistribution, modification, attribution, and any subject or
        branding restrictions.
      </label>
      <div className="flex gap-3">
        <Button
          disabled={busy || !rights || note.length < 10}
          onClick={() =>
            act(
              () =>
                api("admin/review", {
                  id: c.id,
                  decision: "approve",
                  note,
                  rightsConfirmed: rights,
                  category,
                }),
              "Image imported and published.",
            )
          }
        >
          <Check size={15} />
          Approve & import
        </Button>
        <Button
          variant="outline"
          disabled={busy || note.length < 10}
          onClick={() =>
            act(
              () =>
                api("admin/review", {
                  id: c.id,
                  decision: "reject",
                  note,
                  rightsConfirmed: false,
                  category,
                }),
              "Candidate rejected.",
            )
          }
        >
          <X size={15} />
          Reject
        </Button>
      </div>
    </div>
  );
}
function EditWallpaper({
  w,
  busy,
  act,
}: {
  w: any;
  busy: boolean;
  act: (fn: () => Promise<any>, message?: string) => void;
}) {
  const [title, setTitle] = useState(w.title);
  const [category, setCategory] = useState(w.category);
  const [tags, setTags] = useState(w.tags.join(", "));
  const [featured, setFeatured] = useState(w.featured);
  const [published, setPublished] = useState(w.published);
  return (
    <div className="panel flex flex-wrap gap-5">
      <img
        src={`/api/wallpapers/${w.id}/thumbnail`}
        alt={w.title}
        className="w-36 h-28 object-cover rounded-lg"
      />
      <form
        className="flex-1 min-w-60 grid sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(() =>
            api("admin/wallpapers", {
              id: w.id,
              title,
              category,
              tags: tags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean),
              featured,
              published,
            }),
          );
        }}
      >
        <label className="field">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-5">
          <label>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />{" "}
            Featured
          </label>
          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />{" "}
            Published
          </label>
          <Button size="sm" disabled={busy}>
            Save changes
          </Button>
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(
                () => api("admin/enhance", { wallpaperId: w.id }),
                "Enhancement queued. Inspect and approve the result in Jobs.",
              )
            }
          >
            Enhance to 4K
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(
                () => api("admin/regenerate", { wallpaperId: w.id }),
                "Desktop and phone JPG variants regenerated.",
              )
            }
          >
            Regenerate common sizes
          </Button>
        </div>
        <p className="text-xs muted sm:col-span-2 mb-0">
          Uncheck Published to remove an image from the public gallery and
          downloads. Existing variants are reused automatically.
        </p>
      </form>
    </div>
  );
}

function Limits({
  current,
  busy,
  act,
}: {
  current: any;
  busy: boolean;
  act: (fn: () => Promise<any>, message?: string) => void;
}) {
  const [value, setValue] = useState(current);
  return (
    <form
      className="panel max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        act(
          () => api("admin/limits", value),
          "Limits saved for new uploads and jobs.",
        );
      }}
    >
      <h2 className="text-xl">Processing boundaries</h2>
      <p className="muted text-sm">
        Safe ceilings remain enforced. Retention changes apply to new uploads.
      </p>
      {[
        ["uploadMb", "Maximum upload (MB)", 1, 20],
        ["outputMegapixels", "Maximum output (megapixels)", 1, 16],
        ["uploadsPerHour", "Uploads per session per hour", 1, 100],
        ["jobsPerHour", "Jobs per session per hour", 1, 100],
        ["retentionHours", "Private retention (hours)", 1, 168],
      ].map(([key, label, min, max]) => (
        <label className="field mb-4" key={String(key)}>
          {label}
          <input
            type="number"
            min={Number(min)}
            max={Number(max)}
            required
            value={value[String(key)]}
            onChange={(e) =>
              setValue({ ...value, [String(key)]: +e.target.value })
            }
          />
        </label>
      ))}
      <Button disabled={busy}>Save limits</Button>
    </form>
  );
}
