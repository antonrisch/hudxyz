import type { Metadata } from "next";

import { SubmitForm } from "@/components/submit/submit-form";
import { getDraftAppDetail, listCategoriesForForm, serializeDraftDetail } from "@/lib/apps/draft";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a Web App",
  description: "Submit a Meta Ray-Ban Display Web App to hud.xyz.",
  alternates: { canonical: "/apps/submit" },
};

export default async function SubmitAppPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const categories = await listCategoriesForForm();
  const detail = id ? await getDraftAppDetail(id) : null;

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <SubmitForm
        categories={categories}
        initialDetail={detail ? serializeDraftDetail(detail) : null}
      />
    </main>
  );
}
