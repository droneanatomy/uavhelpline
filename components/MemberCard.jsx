import Link from "next/link";

export default function MemberCard() {
  return (
    <section className="member-card">
      <div className="member-card__inner">
        <h3>
          <Link href="#newsletter">Become a member ›</Link>
        </h3>
        <p>Support independent, technical UAV journalism.</p>
        <Link href="#newsletter" className="join">
          Join now
        </Link>
      </div>
    </section>
  );
}
