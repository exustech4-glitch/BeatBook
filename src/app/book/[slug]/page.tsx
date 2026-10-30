import { notFound } from "next/navigation";
import BeatBook from "@/components/BeatBook";
import { loadPublicArtist } from "@/lib/booking-data";

export default async function ArtistBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadPublicArtist(slug);
  if (!data) notFound();
  return <BeatBook initialView="book" allowSwitch={false} artist={data.artist} publicServices={data.services} travelAreas={data.areas} workingHours={data.hours} depositPercent={data.depositPercent} cancellationTerms={data.cancellationTerms} />;
}

