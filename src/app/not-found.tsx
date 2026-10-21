import Link from "next/link";
export default function NotFound() {
  return (
    <div className="shell py-24 text-center">
      <p className="eyebrow">404 / OUT OF FRAME</p>
      <h1 className="page-title">A different view awaits.</h1>
      <p className="muted">This page or wallpaper is no longer available.</p>
      <Link className="text-teal-200" href="/explore">
        Explore the collection →
      </Link>
    </div>
  );
}
