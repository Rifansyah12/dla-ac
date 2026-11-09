import { HomePage } from "@/components/home/home-page";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lots, settings] = await Promise.all([getLots(), getSiteSettings()]);
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><HomePage lots={lots} number={settings.secondaryNumber} technicianDescription={settings.technicianDescription} /></WhatsAppProvider>;
}
