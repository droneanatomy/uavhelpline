// Site sections, in the order the brief specifies.
// `color` is the beat's kicker colour (Rest of World assigns each beat a colour
// from its palette: Cobalt, Magenta, Aji orange, Midnight).
export const CATEGORIES = [
  { slug: "news", label: "News", blurb: "Latest UAV developments, filtered and verified.", color: "#242ef7" },
  { slug: "analysis", label: "Analysis", blurb: "What the news means — depth over headlines.", color: "#ba0582" },
  { slug: "defence-tech", label: "Defence Tech", blurb: "Tactical, ISR, counter-UAV and loitering systems (technical only).", color: "#ff691f" },
  { slug: "commercial-drones", label: "Commercial Drones", blurb: "DJI, Skydio, Autel and the wider commercial market.", color: "#0b2566" },
  { slug: "components", label: "Components", blurb: "Sensors, flight controllers, motors, batteries, comms.", color: "#ba0582" },
  { slug: "ai-autonomy", label: "AI & Autonomy", blurb: "Autonomy stacks, navigation, onboard AI and swarms.", color: "#242ef7" },
  { slug: "regulations", label: "Regulations", blurb: "Rules, certifications and compliance worldwide.", color: "#ff691f" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label])
);

const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.color])
);

export function categoryLabel(slug) {
  return CATEGORY_LABELS[slug] || slug;
}

export function categoryColor(slug) {
  return CATEGORY_COLORS[slug] || "#242ef7";
}
