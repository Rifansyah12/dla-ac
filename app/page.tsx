import type { Metadata } from "next";
import logo from "@/fotoac/logo-dla.png";
import { HomePage } from "@/components/home/home-page";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";
import { siteDescription, siteUrl } from "@/lib/seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const dynamic = "force-dynamic";

export default async function Home() {
  const [lots, settings] = await Promise.all([getLots(), getSiteSettings()]);
  const organization = { "@context": "https://schema.org", "@type": "Organization", name: "DLA AC", url: `${siteUrl}/`, logo: new URL(logo.src, siteUrl).toString(), description: siteDescription };
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} /><HomePage lots={lots} number={settings.secondaryNumber} technicianDescription={settings.technicianDescription} /></WhatsAppProvider>;
}
