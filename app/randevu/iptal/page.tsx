import { CancelBooking } from "@/components/cancel-booking";
import { SiteLogo } from "@/components/site-logo";

export const metadata = { title: "Randevu İptali | Oceanman Edirne", robots: { index: false, follow: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="site-shell cancel-page">
      <header className="site-header"><SiteLogo light /></header>
      <div className="cancel-shell"><CancelBooking token={token} /></div>
    </main>
  );
}
