"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Page() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      const r = await fetch("/api/uploads");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUploads(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load uploads");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function remove(id: string) {
    try {
      const r = await fetch("/api/uploads/" + id, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }
  return (
    <div className="shell pt-16">
      <p className="eyebrow">YOUR PRIVATE SPACE</p>
      <h1 className="page-title">My uploads.</h1>
      <p className="muted mb-8">
        Only available in this browser session. Each upload shows its expiration
        time.
      </p>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading your images…</p>
      ) : !uploads.length ? (
        <div className="panel text-center py-16">
          <h2 className="text-2xl">Start with something of your own.</h2>
          <p className="muted">Your private creations will appear here.</p>
          <Button asChild>
            <Link href="/studio">Open Wallpaper Studio</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {uploads.map((u) => (
            <div className="panel" key={u.id}>
              <img
                src={`/api/uploads/${u.id}/image`}
                alt="Your private upload"
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
              <p className="text-[10px] muted break-all select-all">
                Upload ID: {u.id}
              </p>
              <p className="text-sm">
                {u.width} × {u.height}
              </p>
              <p className="text-xs muted">
                Expires {new Date(u.expiresAt).toLocaleString()}
              </p>
              {u.jobs.map((j: any) => (
                <div
                  className="py-3 border-t border-white/10 text-xs"
                  key={j.id}
                >
                  <p>
                    {j.status} · {j.progress}% · {j.aiStatus}
                  </p>
                  {j.status === "completed" && (
                    <a
                      className="text-teal-200"
                      href={`/api/jobs/${j.id}/result?download=1`}
                    >
                      Download {j.options.width} × {j.options.height}{" "}
                      {j.options.format.toUpperCase()} →
                    </a>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => remove(u.id)}>
                Delete upload & results
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
