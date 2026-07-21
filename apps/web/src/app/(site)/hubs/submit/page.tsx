import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { HubSubmitForm } from "@/components/submit/hub-submit-form";
import { getDraftHubDetail, serializeDraftDetail } from "@/lib/hubs/draft";
import { draftEditCookieName, verifyDraftEditToken } from "@/lib/hubs/draft-edit-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a Hub",
  description: "Submit a Meta Ray-Ban Display hub to the hudxyz.com directory.",
  alternates: { canonical: "/hubs/submit" },
  robots: { index: false, follow: false },
};

export default async function SubmitHubPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const cookieStore = await cookies();

  let initialDetail = null;
  if (id) {
    const detail = await getDraftHubDetail(id);
    if (!detail || detail.status !== "draft") notFound();

    const token = cookieStore.get(draftEditCookieName(detail.publicId))?.value;
    if (!(await verifyDraftEditToken(detail.editTokenHash, token))) notFound();

    initialDetail = serializeDraftDetail(detail);
  }

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <HubSubmitForm key={initialDetail?.publicId ?? id ?? "new"} initialDetail={initialDetail} />
    </main>
  );
}
