"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="shell py-24">
      <h1 className="page-title">A moment out of focus.</h1>
      <p className="muted">
        The service could not complete this request. Please check that the
        database is running and try again.
      </p>
      <button className="chip" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
