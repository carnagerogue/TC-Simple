import { ContactCategory } from "@prisma/client";

export type NormalizedContact = {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  source: "gmail";
  category: ContactCategory;
  organization?: string | null;
  title?: string | null;
};

type PeopleConnection = {
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  photos?: Array<{ url?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  resourceName?: string;
};

type PeopleConnectionsResponse = {
  connections?: PeopleConnection[];
  nextPageToken?: string;
};

function splitName(displayName?: string): { firstName: string; lastName?: string } {
  if (!displayName) return { firstName: "Unknown" };
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.shift() || "Unknown", lastName: parts.join(" ") || undefined };
}

export function inferCategory(orgName?: string | null, title?: string | null): ContactCategory {
  const haystack = `${orgName || ""} ${title || ""}`.toLowerCase();
  if (haystack.match(/agent|broker|realtor/)) return "AGENT";
  if (haystack.match(/escrow/)) return "ESCROW";
  if (haystack.match(/lender|loan|mortgage/)) return "LENDER";
  if (haystack.match(/title/)) return "TITLE";
  if (haystack.match(/vendor|contractor|service/)) return "VENDOR";
  return "OTHER";
}

export function normalizePeopleConnections(data: PeopleConnectionsResponse): NormalizedContact[] {
  const connections: PeopleConnection[] = data.connections ?? [];
  return connections
    .map((person) => {
      const names = person.names?.[0];
      const emails = person.emailAddresses?.[0];
      const phones = person.phoneNumbers?.[0];
      const photos = person.photos?.[0];
      const org = person.organizations?.[0];
      const { firstName, lastName } = splitName(names?.displayName);
      const category = inferCategory(org?.name, org?.title);
      return {
        id: person.resourceName || Math.random().toString(),
        firstName,
        lastName,
        email: emails?.value,
        phone: phones?.value,
        photoUrl: photos?.url,
        source: "gmail" as const,
        organization: org?.name ?? null,
        title: org?.title ?? null,
        category,
      };
    })
    .filter((c: NormalizedContact) => c.firstName);
}

export type MergeResult = {
  create: {
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    category: ContactCategory;
    source: string;
    company?: string | null;
    role?: string | null;
  };
  update: {
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    category: ContactCategory;
    source: string;
    company?: string | null;
    role?: string | null;
  };
};

export function buildContactPayload(
  existing: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    category: ContactCategory;
    company?: string | null;
    role?: string | null;
  } | null,
  incoming: NormalizedContact
): MergeResult {
  const firstName = incoming.firstName || existing?.firstName || "Unknown";
  const lastName = incoming.lastName ?? existing?.lastName ?? null;
  const phone = incoming.phone ?? existing?.phone ?? null;
  const avatarUrl = incoming.photoUrl ?? existing?.avatarUrl ?? null;
  const category = incoming.category || existing?.category || "OTHER";
  const company = incoming.organization ?? existing?.company ?? null;
  const role = incoming.title ?? existing?.role ?? null;

  return {
    create: {
      firstName,
      lastName,
      email: incoming.email || existing?.email || "",
      phone,
      avatarUrl,
      category,
      source: "gmail",
      company,
      role,
    },
    update: {
      firstName,
      lastName,
      phone,
      avatarUrl,
      category,
      source: "gmail",
      company,
      role,
    },
  };
}

type FetchAllDeps = {
  fetchImpl?: typeof fetch;
  pageSize?: number;
};

/**
 * Fetches ALL Google contacts via People API pagination.
 * Docs: https://developers.google.com/people/api/rest/v1/people.connections/list
 */
export async function fetchAllGoogleConnections(
  accessToken: string,
  { fetchImpl = fetch, pageSize = 1000 }: FetchAllDeps = {}
): Promise<PeopleConnection[]> {
  const baseUrl = "https://people.googleapis.com/v1/people/me/connections";
  const personFields = "names,emailAddresses,phoneNumbers,photos,organizations";

  const out: PeopleConnection[] = [];
  let pageToken: string | undefined = undefined;

  // Safety cap to avoid accidental infinite loops
  for (let i = 0; i < 200; i++) {
    const url = new URL(baseUrl);
    url.searchParams.set("personFields", personFields);
    url.searchParams.set("sortOrder", "FIRST_NAME_ASCENDING");
    url.searchParams.set("pageSize", String(Math.min(Math.max(pageSize, 1), 1000)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Google permissions expired (${res.status}). ${txt}`.trim());
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`People API error (${res.status}): ${txt}`.trim());
    }

    const json = (await res.json()) as PeopleConnectionsResponse;
    out.push(...(json.connections ?? []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return out;
}
