import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/giris", "/kayit", "/hesap", "/parola", "/parola-sifirla", "/auth"],
    },
  };
}
