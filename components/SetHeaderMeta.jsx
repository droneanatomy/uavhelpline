"use client";

import { useEffect } from "react";
import { useHeaderMeta } from "./HeaderMeta";

// Drop this (client) component into a page to populate the masthead eyebrow.
// It clears the eyebrow on unmount so it never leaks to the next page.
export default function SetHeaderMeta({ section, headline, sectionHref }) {
  const { setMeta } = useHeaderMeta();
  useEffect(() => {
    setMeta({ section, headline, sectionHref });
    return () => setMeta(null);
  }, [section, headline, sectionHref, setMeta]);
  return null;
}
