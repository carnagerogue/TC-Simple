import assert from "node:assert";
import test from "node:test";
import { ensureGoogleAccessToken, isAccessTokenExpired } from "@/lib/google/refreshGoogleToken";
import { buildContactPayload, normalizePeopleConnections } from "@/lib/google/contacts";
import { ContactCategory } from "@prisma/client";

type UserTokenRow = {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  scope?: string | null;
  expiresAt?: Date | null;
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleTokenExpiry?: Date | null;
};

type UpsertArgs = { create: Partial<UserTokenRow>; update: Partial<UserTokenRow> };

function makeDb(tokens: UserTokenRow) {
  let saved: UserTokenRow | null = tokens;
  return {
    userToken: {
      findFirst: async () => saved,
      upsert: async ({ create, update }: UpsertArgs) => {
        saved = { ...(saved || {}), ...create, ...update } as UserTokenRow;
        return saved;
      },
    },
    get saved() {
      return saved;
    },
  };
}

test("isAccessTokenExpired respects skew", () => {
  const future = new Date(Date.now() + 5 * 60 * 1000);
  assert.strictEqual(isAccessTokenExpired(future, Date.now()), false);
  const past = new Date(Date.now() - 5 * 60 * 1000);
  assert.strictEqual(isAccessTokenExpired(past, Date.now()), true);
});

test("refreshes expired token with refresh token present", async () => {
  const db = makeDb({
    userId: "u1",
    provider: "google",
    accessToken: "old",
    refreshToken: "r1",
    scope: "email",
    expiresAt: new Date(Date.now() - 10_000),
  });

  let called = 0;
  const fetchImpl = async () => {
    called += 1;
    return {
      ok: true,
      json: async () => ({ access_token: "new-token", expires_in: 3600 }),
    } as any;
  };

  const result = await ensureGoogleAccessToken("u1", { fetchImpl, dbClient: db as any });
  assert.strictEqual(result.accessToken, "new-token");
  assert.ok(db.saved?.accessToken === "new-token");
  assert.strictEqual(called, 1);
});

test("throws when refresh token is missing", async () => {
  const db = makeDb({
    userId: "u1",
    provider: "google",
    accessToken: "old",
    refreshToken: "",
    scope: "email",
    expiresAt: new Date(Date.now() - 10_000),
  });

  await assert.rejects(
    () => ensureGoogleAccessToken("u1", { fetchImpl: fetch as any, dbClient: db as any }),
    /Missing Google refresh token/
  );
});

test("returns existing token when still valid", async () => {
  const db = makeDb({
    userId: "u1",
    provider: "google",
    accessToken: "still-valid",
    refreshToken: "r1",
    scope: "email",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  let called = 0;
  const fetchImpl = async () => {
    called += 1;
    return { ok: true, json: async () => ({}) } as any;
  };

  const result = await ensureGoogleAccessToken("u1", { fetchImpl, dbClient: db as any });
  assert.strictEqual(result.accessToken, "still-valid");
  assert.strictEqual(called, 0);
});

test("normalizes empty contacts without crashing", () => {
  const contacts = normalizePeopleConnections({ connections: [] });
  assert.deepStrictEqual(contacts, []);
});

test("buildContactPayload merges without dropping existing data", () => {
  const existing = {
    firstName: "Old",
    lastName: "Name",
    email: "a@test.com",
    phone: "111",
    avatarUrl: "old.png",
    category: ContactCategory.CLIENT,
    company: "Existing Co",
    role: "Manager",
  };
  const incoming = {
    id: "r1",
    firstName: "New",
    lastName: undefined,
    email: "a@test.com",
    phone: undefined,
    photoUrl: undefined,
    source: "gmail" as const,
    category: ContactCategory.OTHER,
  };

  const payload = buildContactPayload(existing, incoming);
  assert.strictEqual(payload.update.firstName, "New");
  assert.strictEqual(payload.update.phone, "111"); // kept existing
  assert.strictEqual(payload.create.email, "a@test.com");
});

