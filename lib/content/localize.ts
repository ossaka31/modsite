import { defaultSite, type SiteContent } from "@/lib/content/schema";
import type { Locale } from "@/lib/i18n";

const english = {
  tagline: "A Fabric mod for Minecraft 26.1.2. It does not launch without Java 25 and Fabric API.",
  story:
    "OSAKA's Fabric mod sits on Minecraft 26.1.2. Three things have to be in place: the right game version, Java 25, and Fabric API. If one is missing, the mod does not load.\n\nThe pickaxe on the cover is the face of it. The head is a crimson crystal, the handle dark and tight. The light comes from the crystal itself.\n\nRead what to install, then download. Features, extra images, and version notes take their place below as they are published.\n\nThe page itself can be read in Turkish and English.",
  seoDescription: "A Fabric mod by OSAKA. Requires Minecraft 26.1.2, Java 25, and Fabric API.",
  footerNote: "Publisher OSAKA. Minecraft and Fabric are trademarks of their owners.",
  downloadLabel: "Download the mod",
  publisherBio: "OSAKA builds and publishes this mod.",
  requirements: {
    "req-fabric": {
      title: "26.1.2",
      detail: "The mod is tied to this game version. It does not load on another one.",
    },
    "req-java": {
      title: "Java 25",
      detail: "The runtime is Java 25. An older one will not open this version.",
    },
    "req-api": {
      title: "Fabric API",
      detail: "The Fabric API jar for the same game version has to sit in the mods folder.",
    },
  },
  steps: {
    "step-java": {
      title: "Install Java 25",
      body: "This version asks for Java 25. An older install stops the game before it opens. Confirm that 25 is the one installed.",
    },
    "step-fabric": {
      title: "Add the Fabric profile",
      body: "Run the official Fabric installer for Minecraft 26.1.2. It adds a separate Fabric profile to the launcher.",
    },
    "step-api": {
      title: "Add Fabric API",
      body: "Put the Fabric API jar that matches 26.1.2 into the .minecraft/mods folder. A version mismatch means the mod never loads.",
    },
    "step-mod": {
      title: "Drop the mod in the same folder",
      body: "Put the downloaded jar next to Fabric API. Choose the Fabric profile in the launcher and open a world.",
    },
  },
  languages: {
    "lang-tr": {
      title: "Türkçe",
      detail: "Primary language of the page.",
    },
    "lang-en": {
      title: "English",
      detail: "Install, account, and admin screens are available in English.",
    },
  },
} as const;

function translated<T extends { id: string }>(
  items: T[],
  originals: T[],
  overlay: Record<string, Partial<T>>,
  fields: (keyof T)[],
): T[] {
  return items.map((item) => {
    const original = originals.find((row) => row.id === item.id);
    const next = overlay[item.id];
    if (!original || !next) return item;
    const copy = { ...item };
    for (const field of fields) {
      if (item[field] === original[field] && next[field] !== undefined) {
        copy[field] = next[field] as T[keyof T];
      }
    }
    return copy;
  });
}

export function localize(site: SiteContent, locale: Locale): SiteContent {
  if (locale === "tr") return site;
  return {
    ...site,
    tagline: site.tagline === defaultSite.tagline ? english.tagline : site.tagline,
    story: site.story === defaultSite.story ? english.story : site.story,
    seoDescription: site.seoDescription === defaultSite.seoDescription ? english.seoDescription : site.seoDescription,
    footerNote: site.footerNote === defaultSite.footerNote ? english.footerNote : site.footerNote,
    downloadLabel: site.downloadLabel === defaultSite.downloadLabel ? english.downloadLabel : site.downloadLabel,
    publisherBio: site.publisherBio === defaultSite.publisherBio ? english.publisherBio : site.publisherBio,
    requirements: translated(site.requirements, defaultSite.requirements, english.requirements, ["title", "detail"]),
    steps: translated(site.steps, defaultSite.steps, english.steps, ["title", "body"]),
    languages: translated(site.languages, defaultSite.languages, english.languages, ["title", "detail"]),
  };
}
