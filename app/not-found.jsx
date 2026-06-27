import Link from "next/link";

export const metadata = { title: "Page not found — UAVHelpline" };

export default function NotFound() {
  return (
    <div className="container notfound">
      <span className="notfound__code">404</span>
      <h1>This page flew out of range</h1>
      <p>
        The page you're looking for doesn't exist, was moved, or never made it
        off the ground. Let's get you back to the signal.
      </p>
      <div className="notfound__actions">
        <Link href="/" className="notfound__btn">Back to home</Link>
        <Link href="/section/news" className="notfound__link">Browse latest →</Link>
      </div>
    </div>
  );
}
