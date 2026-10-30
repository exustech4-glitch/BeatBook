import BeatBook from "@/components/BeatBook";
import NoPublishedStudio from "@/components/NoPublishedStudio";
import { loadPublicArtist } from "@/lib/booking-data";

export default async function BookPage() {
  const data = await loadPublicArtist();
  if (!data) return <NoPublishedStudio />;
  return <BeatBook initialView="book" allowSwitch={false} artist={data.artist} publicServices={data.services} travelAreas={data.areas} workingHours={data.hours} depositPercent={data.depositPercent} cancellationTerms={data.cancellationTerms} />;
}

