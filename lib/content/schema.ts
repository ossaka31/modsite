import { z } from "zod";
import { isHttpsUrl, isSafeImageSrc } from "@/lib/urls";
import { contentLimits } from "@/lib/content/limits";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/);

function item<T extends z.ZodRawShape>(shape: T) {
  return z.object({ id: idSchema, ...shape });
}

export const siteSchema = z.object({
  modName: z.string().trim().min(1, "Mod adı boş olamaz.").max(contentLimits.modName),
  eyebrow: z.string().trim().min(1).max(contentLimits.eyebrow),
  publisher: z.string().trim().min(1, "Yayıncı boş olamaz.").max(contentLimits.publisher),
  tagline: z.string().trim().min(1).max(contentLimits.tagline),
  story: z.string().trim().min(1).max(contentLimits.story),
  seoDescription: z.string().trim().min(1).max(contentLimits.seo),
  footerNote: z.string().trim().max(contentLimits.footer),
  downloadLabel: z.string().trim().min(1).max(contentLimits.downloadLabel),
  downloadUrl: z
    .string()
    .trim()
    .max(contentLimits.downloadUrl)
    .refine(isHttpsUrl, "İndirme bağlantısı https olmalı."),
  heroImage: z
    .string()
    .trim()
    .max(contentLimits.imageSrc)
    .refine(isSafeImageSrc, "Kapak görseli geçersiz."),
  heroPath: z.string().trim().max(80),
  publisherBio: z.string().trim().max(contentLimits.publisherBio),
  publisherAvatar: z
    .string()
    .trim()
    .max(contentLimits.imageSrc)
    .refine((value) => value === "" || isSafeImageSrc(value), "Yayıncı görseli geçersiz."),
  publisherAvatarPath: z.string().trim().max(80),
  requirements: z
    .array(
      item({
        kicker: z.string().trim().min(1).max(contentLimits.requirementKicker),
        title: z.string().trim().min(1).max(contentLimits.requirementTitle),
        detail: z.string().trim().min(1).max(contentLimits.requirementDetail),
      }),
    )
    .min(1)
    .max(6),
  steps: z
    .array(
      item({
        title: z.string().trim().min(1).max(contentLimits.stepTitle),
        body: z.string().trim().min(1).max(contentLimits.stepBody),
      }),
    )
    .min(1)
    .max(12),
  features: z
    .array(
      item({
        title: z.string().trim().min(1).max(contentLimits.featureTitle),
        body: z.string().trim().min(1).max(contentLimits.featureBody),
      }),
    )
    .max(12),
  changelog: z
    .array(
      item({
        version: z.string().trim().min(1).max(contentLimits.changelogVersion),
        date: z.string().trim().max(contentLimits.changelogDate),
        notes: z.string().trim().min(1).max(contentLimits.changelogNotes),
      }),
    )
    .max(30),
  links: z
    .array(
      item({
        label: z.string().trim().min(1).max(contentLimits.linkLabel),
        href: z
          .string()
          .trim()
          .max(contentLimits.linkHref)
          .refine(isHttpsUrl, "Bağlantı https olmalı."),
      }),
    )
    .max(8),
  languages: z
    .array(
      item({
        title: z.string().trim().min(1).max(contentLimits.languageTitle),
        detail: z.string().trim().min(1).max(contentLimits.languageDetail),
      }),
    )
    .max(12),
});

export type SiteContent = z.infer<typeof siteSchema>;

export const defaultSite: SiteContent = {
  modName: "OSAKA",
  eyebrow: "FABRIC MOD",
  publisher: "OSAKA",
  tagline: "Minecraft 26.1.2 için bir Fabric modu. Java 25 ve Fabric API olmadan açılmaz.",
  story:
    "OSAKA'nın Fabric modu, Minecraft 26.1.2 üzerinde durur. Kurulumun üç ayağı vardır: doğru oyun sürümü, Java 25 ve Fabric API. Biri eksikse mod yüklenmez.\n\nKapaktaki kazma bu işin görünen yüzüdür. Kafa kızıl bir kristal, sap koyu ve sıkıdır. Işık taşın içinden değil, kristalin kendi damarından gelir.\n\nÖnce ne kurman gerektiğini oku, sonra indir. Özellikler, ek görseller ve sürüm notları yayımlandıkça aşağıda sırayla yerini alır.",
  seoDescription:
    "OSAKA imzalı Fabric modu. Minecraft 26.1.2, Java 25 ve Fabric API gerektirir.",
  footerNote: "Yayıncı OSAKA. Minecraft ve Fabric, sahiplerinin markalarıdır.",
  downloadLabel: "Modu indir",
  downloadUrl: "",
  heroImage: "/hero-pickaxe.jpg",
  heroPath: "",
  publisherBio: "OSAKA, bu modun yapımcısı ve yayıncısı.",
  publisherAvatar: "",
  publisherAvatarPath: "",
  requirements: [
    {
      id: "req-fabric",
      kicker: "FABRIC",
      title: "26.1.2",
      detail: "Mod bu oyun sürümüne bağlıdır. Başka bir sürümde yüklenmez.",
    },
    {
      id: "req-java",
      kicker: "JAVA",
      title: "Java 25",
      detail: "Çalışma zamanı Java 25'tir. Daha eskisi bu sürümü açmaz.",
    },
    {
      id: "req-api",
      kicker: "API",
      title: "Fabric API",
      detail: "Aynı oyun sürümünün Fabric API dosyası mods klasöründe durmalıdır.",
    },
  ],
  steps: [
    {
      id: "step-java",
      title: "Java 25 kur",
      body: "Bu sürüm Java 25 ister. Eski bir kurulum, oyunu daha açılmadan durdurur. 25'in kurulu olduğunu doğrula.",
    },
    {
      id: "step-fabric",
      title: "Fabric profilini ekle",
      body: "Minecraft 26.1.2 için resmi Fabric yükleyicisini çalıştır. Başlatıcıya ayrı bir Fabric profili gelir.",
    },
    {
      id: "step-api",
      title: "Fabric API'yi koy",
      body: "26.1.2 ile eşleşen Fabric API jar dosyasını .minecraft/mods klasörüne koy. Sürüm uyuşmazsa mod sessizce yüklenmez.",
    },
    {
      id: "step-mod",
      title: "Modu aynı klasöre bırak",
      body: "İndirdiğin jar dosyasını Fabric API'nin yanına koy. Başlatıcıdan Fabric profilini seçip dünyayı aç.",
    },
  ],
  features: [],
  changelog: [],
  links: [],
  languages: [
    {
      id: "lang-tr",
      title: "Türkçe",
      detail: "Sayfanın ana dili. Mod sayfası bu dilde okunur.",
    },
    {
      id: "lang-en",
      title: "English",
      detail: "The page is fully available in English, including install and account screens.",
    },
  ],
};

export function readSite(input: unknown): SiteContent {
  const raw = input && typeof input === "object" ? (input as Partial<SiteContent>) : {};
  const parsed = siteSchema.safeParse({ ...defaultSite, ...raw });
  return parsed.success ? parsed.data : defaultSite;
}

const fieldLabels: Record<string, string> = {
  modName: "Mod adı",
  eyebrow: "Üst etiket",
  publisher: "Yayıncı",
  tagline: "Kısa tanıtım",
  story: "Anlatı",
  seoDescription: "Arama açıklaması",
  footerNote: "Alt bilgi",
  downloadLabel: "Düğme yazısı",
  downloadUrl: "İndirme bağlantısı",
  heroImage: "Kapak görseli",
  heroPath: "Kapak dosyası",
  publisherBio: "Yayıncı tanıtımı",
  publisherAvatar: "Yayıncı görseli",
  publisherAvatarPath: "Yayıncı dosyası",
  requirements: "Gereksinimler",
  steps: "Kurulum adımları",
  features: "Özellikler",
  changelog: "Sürüm notları",
  links: "Bağlantılar",
  languages: "Diller",
  kicker: "Etiket",
  title: "Başlık",
  detail: "Açıklama",
  body: "Metin",
  notes: "Not",
  version: "Sürüm",
  date: "Tarih",
  label: "Yazı",
  href: "Bağlantı",
};

/** Kaydetmenin neden reddedildiğini alan adıyla birlikte döner. */
export function describeSiteIssues(input: unknown): string {
  const parsed = siteSchema.safeParse(input);
  if (parsed.success) return "";

  const issue = parsed.error.issues[0];
  if (!issue) return "";

  const label =
    issue.path
      .filter((part): part is string => typeof part === "string")
      .map((part) => fieldLabels[part] ?? part)
      .join(" → ") || "İçerik";

  if (issue.code === "too_big") {
    return `${label}: en fazla ${issue.maximum} karakter`;
  }
  if (issue.code === "too_small") {
    return issue.type === "array" ? `${label}: en az bir kayıt gerekli` : `${label}: boş bırakılamaz`;
  }
  if (issue.code === "invalid_type") {
    return `${label}: eksik veya geçersiz`;
  }
  return `${label}: ${issue.message}`;
}

export const emailSchema = z
  .string()
  .trim()
  .email("E-posta geçersiz.")
  .max(254);

export const passwordSchema = z
  .string()
  .min(12, "Parola en az 12 karakter olmalı.")
  .max(72, "Parola en fazla 72 karakter olabilir.")
  .regex(/[A-Za-z]/, "Parolada en az bir harf olmalı.")
  .regex(/[0-9]/, "Parolada en az bir rakam olmalı.")
  .regex(/[^A-Za-z0-9]/, "Parolada en az bir özel karakter olmalı.");

export const codeSchema = z.string().trim().regex(/^\d{6}$/, "Kod 6 rakam olmalı.");
