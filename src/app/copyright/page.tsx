"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export default function Page() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("Your report has been saved for administrator review.");
      setReason("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit report");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell pt-16 max-w-3xl!">
      <p className="eyebrow">RESPONSIBLY CURATED</p>
      <h1 className="page-title">Copyright & removal.</h1>
      <p className="muted leading-7 mb-8">
        If an image infringes your rights or raises a content concern, tell us.
        Include the wallpaper URL, your relationship to the work, evidence of
        ownership where relevant, and the action you request. Reports are stored
        privately for the site administrator.
      </p>
      <form className="panel space-y-5" onSubmit={submit}>
        <label className="field">
          Contact email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className="field">
          Affected page URL
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={1000}
          />
        </label>
        <label className="field">
          Details and requested action
          <textarea
            required
            minLength={20}
            maxLength={4000}
            rows={6}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <Button disabled={busy}>
          {busy ? "Submitting…" : "Submit report"}
        </Button>
        {message && (
          <p role="status" className="notice text-sm">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
