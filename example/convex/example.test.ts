import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { initConvexTest } from "./setup.test";
import { api } from "./_generated/api";

describe("Zanvex ReBAC", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  test("direct membership check", async () => {
    const t = initConvexTest();

    // Add user to org
    await t.mutation(api.example.addUserToOrg, {
      userId: "alice",
      orgId: "acme",
    });

    // Check membership
    const isMember = await t.query(api.example.isOrgMember, {
      userId: "alice",
      orgId: "acme",
    });
    expect(isMember).toBe(true);

    // Non-member should return false
    const isNotMember = await t.query(api.example.isOrgMember, {
      userId: "bob",
      orgId: "acme",
    });
    expect(isNotMember).toBe(false);
  });

  test("1-hop traversal: user -> org -> resource", async () => {
    const t = initConvexTest();

    // Setup: alice is member of acme, acme owns studio-a
    await t.mutation(api.example.addUserToOrg, {
      userId: "alice",
      orgId: "acme",
    });
    await t.mutation(api.example.assignResourceToOrg, {
      resourceId: "studio-a",
      orgId: "acme",
    });

    // Alice can access studio-a via org membership
    const canAccess = await t.query(api.example.canAccessResource, {
      userId: "alice",
      resourceId: "studio-a",
    });
    expect(canAccess).toBe(true);

    // Bob cannot access (not a member)
    const cannotAccess = await t.query(api.example.canAccessResource, {
      userId: "bob",
      resourceId: "studio-a",
    });
    expect(cannotAccess).toBe(false);
  });

  test("revocation removes access immediately", async () => {
    const t = initConvexTest();

    // Setup
    await t.mutation(api.example.addUserToOrg, {
      userId: "alice",
      orgId: "acme",
    });
    await t.mutation(api.example.assignResourceToOrg, {
      resourceId: "studio-a",
      orgId: "acme",
    });

    // Verify access
    let canAccess = await t.query(api.example.canAccessResource, {
      userId: "alice",
      resourceId: "studio-a",
    });
    expect(canAccess).toBe(true);

    // Remove alice from org
    await t.mutation(api.example.removeUserFromOrg, {
      userId: "alice",
      orgId: "acme",
    });

    // Access should be revoked immediately
    canAccess = await t.query(api.example.canAccessResource, {
      userId: "alice",
      resourceId: "studio-a",
    });
    expect(canAccess).toBe(false);
  });

  test("list org members", async () => {
    const t = initConvexTest();

    // Add multiple users
    await t.mutation(api.example.addUserToOrg, {
      userId: "alice",
      orgId: "acme",
    });
    await t.mutation(api.example.addUserToOrg, {
      userId: "bob",
      orgId: "acme",
    });

    // List members
    const members = await t.query(api.example.listOrgMembers, {
      orgId: "acme",
    });
    expect(members).toHaveLength(2);
    expect(members.map((m: any) => m.subjectId).sort()).toEqual(["alice", "bob"]);
  });

  test("setupDemo creates expected structure", async () => {
    const t = initConvexTest();

    // Run demo setup
    const result = await t.mutation(api.example.setupDemo, {});
    expect(result.orgId).toBe("acme-studio");
    expect(result.users).toEqual(["alice", "bob"]);
    expect(result.resources).toEqual(["studio-a", "studio-b"]);

    // Verify alice can access both studios
    const canAccessA = await t.query(api.example.canAccessResource, {
      userId: "alice",
      resourceId: "studio-a",
    });
    const canAccessB = await t.query(api.example.canAccessResource, {
      userId: "alice",
      resourceId: "studio-b",
    });
    expect(canAccessA).toBe(true);
    expect(canAccessB).toBe(true);

    // Cleanup
    await t.mutation(api.example.cleanupDemo, {});
  });
});
