import { ConvexClientProvider } from "@/components/convex-client-provider";
import { TravelApp } from "@/components/travel-app";

export default function Home() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.2),transparent_30%),linear-gradient(180deg,#f7fee7_0%,#fefce8_45%,#fff7ed_100%)] px-4">
        <div className="rounded-4xl border border-dashed border-base-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Missing `NEXT_PUBLIC_CONVEX_URL`. Add it in `.env.local`, then run Convex.
        </div>
      </main>
    );
  }

  return (
    <ConvexClientProvider>
      <TravelApp />
    </ConvexClientProvider>
  );
}
