import { cn } from "@/lib/utils";

export function ListingSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(className)}>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
