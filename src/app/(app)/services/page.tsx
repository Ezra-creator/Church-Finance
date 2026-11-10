import React from "react";
import { requireUser } from "@/server/guards";
import { listRecentServices } from "@/features/services/queries";
import { CollectionsView } from "@/features/services/components/collections-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collections",
};

export default async function CollectionsPage() {
  await requireUser();
  const services = await listRecentServices(50);

  const serialized = services.map((s) => ({
    id: s.id,
    serviceDate: s.serviceDate.toISOString(),
    serviceType: s.serviceType,
    title: s.title,
    status: s.status,
    grandTotal: s.grandTotal.toString(),
    countedBy: s.countedBy ? { name: s.countedBy.name } : null,
    witnessName: s.witnessName,
  }));

  return <CollectionsView services={serialized} />;
}
