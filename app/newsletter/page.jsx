import SetHeaderMeta from "../../components/SetHeaderMeta";
import SharePage from "../../components/SharePage";
import NewsletterForm from "../../components/NewsletterForm";

export const metadata = {
  title: "Newsletter — UAVHelpline",
  description:
    "Get UAVHelpline's verified drone and UAV reporting — defence, commercial, components, autonomy, and regulation — in your inbox.",
};

export default function NewsletterPage() {
  return (
    <div className="section-page">
      <SetHeaderMeta section="Newsletter" sectionHref="/newsletter" />
      <div className="section-layout">
        <aside className="section-aside">
          <h1>Newsletter</h1>
          <p>The week in UAV technology — verified, technical, and politics-free.</p>
          <SharePage title="UAVHelpline Newsletter" />
        </aside>

        <div className="section-main">
          <div className="prose">
            <p>
              A world of drones in your inbox. The developments that matter
              across defence, commercial, components, and regulation — distilled
              into one fast, evidence-first read.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>
    </div>
  );
}
