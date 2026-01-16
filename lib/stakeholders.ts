import { MyClientRole, StakeholderRole } from "@prisma/client";
import { db } from "./db";

type Role = StakeholderRole | "BUYER" | "SELLER";

export async function getStakeholderByRole(projectId: string, role: Role, userId?: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ...(userId ? { userId } : {}) },
    select: {
      contacts: {
        where: { role },
        include: { contact: true },
        take: 1,
      },
    },
  });

  return project?.contacts?.[0] ?? null;
}

export async function getMyClient(projectId: string, userId?: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ...(userId ? { userId } : {}) },
    select: { myClientRole: true, userId: true },
  });

  if (!project?.myClientRole) return null;

  const stakeholder = await getStakeholderByRole(projectId, project.myClientRole, userId || project.userId);
  if (!stakeholder) return null;

  return {
    role: project.myClientRole as MyClientRole,
    stakeholderId: stakeholder.id,
    contact: stakeholder.contact,
  };
}

export function buildMyClientPlaceholders(contact?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const fullName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ");
  return {
    myClientName: fullName || "",
    myClientEmail: contact?.email || "",
    myClientPhone: contact?.phone || "",
  };
}

export async function getRecipientForTask(projectId: string, toRole?: StakeholderRole | string | null, userId?: string) {
  const normalized = (toRole || "").toString().toUpperCase() as StakeholderRole;
  if (!normalized) return null;
  return getStakeholderByRole(projectId, normalized, userId);
}

