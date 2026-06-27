import SetHeaderMeta from "../../components/SetHeaderMeta";
import SharePage from "../../components/SharePage";

export const metadata = {
  title: "About — UAVHelpline",
  description:
    "UAVHelpline is an independent, evidence-first intelligence platform covering the global drone and UAV industry.",
};

export default function AboutPage() {
  return (
    <div className="section-page">
      <SetHeaderMeta section="About" sectionHref="/about" />
      <div className="section-layout">
        <aside className="section-aside">
          <h1>About</h1>
          <p>Independent, evidence-first intelligence on the global UAV industry.</p>
          <SharePage title="About UAVHelpline" />
        </aside>

        <div className="section-main">
          <div className="prose">
            <p>
              UAVHelpline is an independent intelligence platform covering the
              global drone and UAV industry — the technology, engineering,
              products, components, autonomy, and regulation that move it forward.
              We monitor 100+ trusted sources across defence, commercial, and
              research aviation, cross-check every story against independent or
              primary sources before we publish, and write neutral, technical
              analysis that explains what a development actually means. No
              politics, no hype, no copied press releases — just verified,
              engineering-first reporting on where unmanned flight is heading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
