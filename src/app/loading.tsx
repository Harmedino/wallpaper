export default function Loading() {
  return (
    <div
      className="shell py-24 loading-route"
      role="status"
      aria-label="Loading page"
    >
      <p className="eyebrow">FINDING YOUR NEXT VIEW…</p>
      <div className="h-64 bg-white/5 rounded-2xl" />
    </div>
  );
}
