/**
 * Alan sınırları tek yerde durur: şema ve panel formu aynı sayıyı kullanır.
 * Bu dosyada zod yok; istemciye güvenle aktarılır.
 */
export const contentLimits = {
  modName: 80,
  eyebrow: 40,
  publisher: 80,
  seo: 300,
  tagline: 220,
  story: 4000,
  footer: 300,
  publisherBio: 240,
  downloadLabel: 40,
  downloadUrl: 500,
  imageSrc: 500,
  requirementKicker: 24,
  requirementTitle: 60,
  requirementDetail: 240,
  stepTitle: 80,
  stepBody: 600,
  featureTitle: 80,
  featureBody: 500,
  changelogVersion: 32,
  changelogDate: 32,
  changelogNotes: 2000,
  linkLabel: 40,
  linkHref: 500,
  languageTitle: 40,
  languageDetail: 240,
  commentBody: 1200,
  commentAuthor: 40,
} as const;
