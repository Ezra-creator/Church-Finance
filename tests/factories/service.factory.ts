import { ServiceRecord, ServiceStatus, ServiceType } from "@prisma/client";

export function buildServiceRecordFixture(
  overrides: Partial<ServiceRecord> = {}
): ServiceRecord {
  const id = overrides.id || `service_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    serviceDate: overrides.serviceDate || new Date("2026-10-25T00:00:00.000Z"),
    serviceType: overrides.serviceType || ServiceType.SUNDAY,
    title: overrides.title || null,
    status: overrides.status || ServiceStatus.OPEN,
    countedById: overrides.countedById || null,
    witnessName: overrides.witnessName || null,
    notes: overrides.notes || null,
    periodId: overrides.periodId || null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}
