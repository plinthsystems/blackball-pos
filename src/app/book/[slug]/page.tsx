import { notFound } from "next/navigation";
import { BookPageView } from "@/features/booking/components/book-page";
import { getPublicBookCatalog } from "@/features/booking/queries";

export const dynamic = "force-dynamic";

export default async function PublicBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublicBookCatalog(slug);
  if (!catalog) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <BookPageView catalog={catalog} />
    </main>
  );
}
