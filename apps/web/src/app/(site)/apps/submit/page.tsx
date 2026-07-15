import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { SubmitForm } from "@/components/submit/submit-form";
import { appsMedia } from "@/flags";
import { getDraftAppDetail, listCategoriesForForm, serializeDraftDetail } from "@/lib/apps/draft";
import { draftEditCookieName, verifyDraftEditToken } from "@/lib/apps/draft-edit-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a Web App",
  description: "Submit a Meta Ray-Ban Display Web App to hudxyz.com.",
  alternates: { canonical: "/apps/submit" },
  robots: { index: false, follow: false },
};

export default async function SubmitAppPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  const [categories, appsMediaEnabled, cookieStore] = await Promise.all([
    listCategoriesForForm(),
    appsMedia(),
    cookies(),
  ]);

  let initialDetail = null;
  if (id) {
    const detail = await getDraftAppDetail(id);
    if (!detail || detail.status !== "draft") notFound();

    const token = cookieStore.get(draftEditCookieName(detail.publicId))?.value;
    if (!(await verifyDraftEditToken(detail.editTokenHash, token))) notFound();

    initialDetail = serializeDraftDetail(detail);
  }

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <SubmitForm
        key={initialDetail?.publicId ?? id ?? "new"}
        categories={categories}
        initialDetail={initialDetail}
        appsMediaEnabled={appsMediaEnabled}
      />
    </main>
  );
}
