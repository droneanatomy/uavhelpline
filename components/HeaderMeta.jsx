"use client";

import { createContext, useContext, useState } from "react";

// Lets a page (article/section) feed the masthead an "eyebrow" — the section
// label + current headline shown in place of the category beats, RoW-style.
const HeaderMetaCtx = createContext(null);

export function HeaderMetaProvider({ children }) {
  const [meta, setMeta] = useState(null); // { section, headline, sectionHref }
  return (
    <HeaderMetaCtx.Provider value={{ meta, setMeta }}>
      {children}
    </HeaderMetaCtx.Provider>
  );
}

export function useHeaderMeta() {
  return useContext(HeaderMetaCtx) || { meta: null, setMeta: () => {} };
}
