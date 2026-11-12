import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeView } from "@/components/home-view";
import { localize } from "@/lib/content/localize";
import { getComments, getHomeData } from "@/lib/content/load";
import { messages } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getHomeData();
  return {
    title: site.modName,
    description: site.seoDescription,
  };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">Yükleniyor</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const [data, comments, locale] = await Promise.all([getHomeData(), getComments(), getLocale()]);
  return (
    <HomeView
      site={localize(data.site, locale)}
      gallery={data.gallery}
      comments={comments}
      labels={messages[locale].home}
      locale={locale}
    />
  );
}
