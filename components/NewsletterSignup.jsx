import Link from "next/link";

function DroneMark() {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" aria-hidden="true">
      {/* arms */}
      <g strokeWidth="11" strokeLinecap="round">
        <line x1="100" y1="100" x2="48" y2="48" />
        <line x1="100" y1="100" x2="152" y2="48" />
        <line x1="100" y1="100" x2="48" y2="152" />
        <line x1="100" y1="100" x2="152" y2="152" />
      </g>
      {/* rotors */}
      <g strokeWidth="9">
        <circle cx="48" cy="48" r="30" />
        <circle cx="152" cy="48" r="30" />
        <circle cx="48" cy="152" r="30" />
        <circle cx="152" cy="152" r="30" />
      </g>
      {/* body */}
      <circle cx="100" cy="100" r="24" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function NewsletterSignup({ compact = false }) {
  if (compact) {
    return (
      <section className="news-compact">
        <div>
          <span className="k">The Weekly Digest</span>
          <h2>Drones in your inbox</h2>
          <p>
            The week's developments across defence, commercial, components, and
            regulation — one fast read.
          </p>
        </div>
        <Link className="nl-form" href="/newsletter" style={{ display: "inline-block" }}>
          <button type="button">Subscribe free</button>
        </Link>
      </section>
    );
  }

  return (
    <section className="news-module" id="newsletter">
      <div className="news-module__art">
        <DroneMark />
      </div>
      <div className="news-module__content">
        <h2>A world of drones in your inbox</h2>
        <p>
          Exclusive reporting and analysis across defence, commercial,
          components, and regulation — distilled into one fast read, every week.
          See the full picture of how UAV technology is shaping the world.
        </p>
        <Link className="nl-cta" href="/newsletter">Subscribe →</Link>
      </div>
      <img
        className="news-module__phone"
        src="/newsletter-phone.png"
        alt="UAVHelpline on mobile"
        aria-hidden="true"
      />
    </section>
  );
}
