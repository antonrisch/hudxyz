import { ListingSection } from "@/components/listings/listing-section";

export function ListingOverview({ description }: { description: string | null }) {
  const text = description?.trim() ?? "";
  if (!text) return null;

  return (
    <ListingSection title="Overview">
      <p className="text-base/relaxed whitespace-pre-wrap text-foreground">{text}</p>
    </ListingSection>
  );
}
