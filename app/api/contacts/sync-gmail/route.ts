import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidGoogleAccessToken } from "@/lib/google/tokenManager";
import db from "@/lib/db";
import { ensureDbReady } from "@/lib/db";
import { buildContactPayload, fetchAllGoogleConnections, normalizePeopleConnections } from "@/lib/google/contacts";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || session?.user?.email || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDbReady();

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No Google access token. Please reconnect your Google account." },
        { status: 400 }
      );
    }

    const connections = await fetchAllGoogleConnections(accessToken);
    const contacts = normalizePeopleConnections({ connections });

    const emailContacts = contacts.filter((c) => typeof c.email === "string" && c.email.length > 0);
    const phoneOnlyContacts = contacts.filter(
      (c) => (!c.email || c.email.length === 0) && typeof c.phone === "string" && c.phone.length > 0
    );

    const emails = Array.from(new Set(emailContacts.map((c) => c.email!)));
    const existingByEmail = new Map(
      (
        await db.contact.findMany({
          where: { userId, email: { in: emails } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            category: true,
            company: true,
            role: true,
          },
        })
      ).map((c) => [c.email!, c])
    );

    const phones = Array.from(new Set(phoneOnlyContacts.map((c) => c.phone!)));
    const existingByPhone = new Map(
      (
        await db.contact.findMany({
          where: { userId, email: null, phone: { in: phones } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            category: true,
            company: true,
            role: true,
          },
        })
      ).map((c) => [c.phone!, c])
    );

    let created = 0;
    let updated = 0;
    const ops: Array<() => Promise<void>> = [];

    for (const incoming of emailContacts) {
      const existing = existingByEmail.get(incoming.email!);
      const payload = buildContactPayload(existing ?? null, incoming);
      if (existing) {
        updated++;
        ops.push(async () => {
          await db.contact.update({
            where: { id: existing.id },
            data: {
              firstName: payload.update.firstName,
              lastName: payload.update.lastName ?? null,
              email: incoming.email!,
              phone: payload.update.phone ?? null,
              avatarUrl: payload.update.avatarUrl ?? null,
              category: payload.update.category,
              source: payload.update.source,
              company: payload.update.company ?? null,
              role: payload.update.role ?? null,
            },
          });
        });
      } else {
        created++;
        ops.push(async () => {
          await db.contact.create({
            data: {
              userId,
              firstName: payload.create.firstName,
              lastName: payload.create.lastName ?? null,
              email: incoming.email!,
              phone: payload.create.phone ?? null,
              avatarUrl: payload.create.avatarUrl ?? null,
              category: payload.create.category,
              source: payload.create.source,
              company: payload.create.company ?? null,
              role: payload.create.role ?? null,
            },
          });
        });
      }
    }

    for (const incoming of phoneOnlyContacts) {
      const existing = existingByPhone.get(incoming.phone!);
      const payload = buildContactPayload(existing ?? null, incoming);
      if (existing) {
        updated++;
        ops.push(async () => {
          await db.contact.update({
            where: { id: existing.id },
            data: {
              firstName: payload.update.firstName,
              lastName: payload.update.lastName ?? null,
              phone: incoming.phone!,
              email: null,
              avatarUrl: payload.update.avatarUrl ?? null,
              category: payload.update.category,
              source: payload.update.source,
              company: payload.update.company ?? null,
              role: payload.update.role ?? null,
            },
          });
        });
      } else {
        created++;
        ops.push(async () => {
          await db.contact.create({
            data: {
              userId,
              firstName: payload.create.firstName,
              lastName: payload.create.lastName ?? null,
              email: null,
              phone: incoming.phone!,
              avatarUrl: payload.create.avatarUrl ?? null,
              category: payload.create.category,
              source: payload.create.source,
              company: payload.create.company ?? null,
              role: payload.create.role ?? null,
            },
          });
        });
      }
    }

    // Execute with bounded concurrency
    const CONCURRENCY = 20;
    for (let i = 0; i < ops.length; i += CONCURRENCY) {
      await Promise.all(ops.slice(i, i + CONCURRENCY).map((fn) => fn()));
    }

    return NextResponse.json({
      fetched: contacts.length,
      created,
      updated,
      synced: created + updated,
      skipped: contacts.length - (created + updated),
    });
  } catch (e: unknown) {
    console.error("sync-gmail error", e);
    const error = e as { message?: string };
    return NextResponse.json(
      {
        error: "Unable to sync Gmail contacts",
        detail: error.message ?? "unknown error",
      },
      { status: 500 }
    );
  }
}
