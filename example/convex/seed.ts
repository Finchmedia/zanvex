/**
 * Zanvex Example App - Comprehensive Seed Script
 *
 * This script is the SOURCE OF TRUTH for all data in the Zanvex demo.
 *
 * USAGE:
 *
 * 1. Nuclear Option (recommended for fresh start):
 *    npx convex data clear --all
 *    npx convex run seed:seedFresh '{"includeDemoData": true}'
 *
 *    OR use the convenient shorthand:
 *    npx convex run seed:seedFresh
 *
 * 2. Incremental Seeding (if you already have data):
 *    npx convex run seed:seedAll '{"includeDemoData": true}'
 *
 * 3. Individual Functions (for debugging):
 *    npx convex run seed:seedPermissions
 *    npx convex run seed:seedRelations
 *    npx convex run seed:seedObjectTypes
 *    npx convex run seed:seedPermissionRules
 *    npx convex run seed:seedDemoData
 *
 * WHAT GETS SEEDED:
 *
 * Component Catalogs (source of truth):
 * - 4 CRUD permissions (create, read, update, delete)
 * - 11 relation names (parent, owner, member_of, admin_of, booker, etc.)
 * - 4 object types (user, org, resource, booking)
 * - 11 permission rules (3 org + 4 resource + 4 booking)
 *
 * App Data + Tuples (via dual-write):
 * - 2 organizations (Acme Studio, BetaCo Studio)
 * - 4 org members (Alice admin, Bob member at Acme | Charlie admin, Diana member at BetaCo)
 * - 4 external customers (CustomerA, B, C, D - not in any org)
 * - 4 resources (Studio A, B at Acme | Studio X, Y at BetaCo)
 * - 4 bookings (1 per resource, each by different customer)
 * - 16 Zanvex tuples (4 org memberships + 4 resource ownerships + 8 booking relations)
 */

import { mutation } from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { createZanvexClient } from "@mrfinch/zanvex";
import { components } from "./_generated/api.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { PERMISSIONS, RELATION_NAMES } from "./constants.js";

const zanvex = createZanvexClient(components.zanvex);

/**
 * Seed permission catalog with CRUD + common actions
 */
export const seedPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    for (const perm of PERMISSIONS) {
      await zanvex.registerPermission(ctx, perm);
    }

    console.log(`Seeded ${PERMISSIONS.length} permissions`);
    return { total: PERMISSIONS.length };
  },
});

/**
 * Seed relation catalog with common ReBAC patterns
 */
export const seedRelations = mutation({
  args: {},
  handler: async (ctx) => {
    for (const rel of RELATION_NAMES) {
      await zanvex.registerRelationName(ctx, rel);
    }

    console.log(`Seeded ${RELATION_NAMES.length} relations`);
    return { total: RELATION_NAMES.length };
  },
});

/**
 * Seed object types for booking system example
 */
export const seedObjectTypes = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.app.initializeObjectTypes, {});
    console.log("Seeded object types (user, org, resource, booking)");
    return { total: 4 };
  },
});

/**
 * Seed permission rules for booking system example
 */
export const seedPermissionRules = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.app.initializePermissionRules, {});
    console.log("Seeded permission rules");
    return { total: 6 };
  },
});

/**
 * Seed comprehensive demo data
 *
 * Creates a complete demo dataset with 2 orgs, 4 users, 4 resources, and 8 bookings.
 * All Zanvex tuples are automatically created via dual-write mutations.
 *
 * This is idempotent - safe to run multiple times.
 */
export const seedDemoData = mutation({
  args: {},
  returns: v.object({
    users: v.object({
      acme: v.array(v.id("users")),
      betaco: v.array(v.id("users"))
    }),
    customers: v.array(v.id("users")),
    orgs: v.object({
      acme: v.id("orgs"),
      betaco: v.id("orgs")
    }),
    resources: v.object({
      acme: v.array(v.id("resources")),
      betaco: v.array(v.id("resources"))
    }),
    bookings: v.array(v.id("bookings")),
    tuples: v.number(),
  }),
  handler: async (ctx): Promise<{
    users: { acme: Id<"users">[]; betaco: Id<"users">[] };
    customers: Id<"users">[];
    orgs: { acme: Id<"orgs">; betaco: Id<"orgs"> };
    resources: { acme: Id<"resources">[]; betaco: Id<"resources">[] };
    bookings: Id<"bookings">[];
    tuples: number;
  }> => {
    console.log("🎭 Starting demo data seed...\n");

    // Helper: Get or create user (idempotent)
    const getOrCreateUser = async (name: string, email: string): Promise<Id<"users">> => {
      const existing = (await ctx.db.query("users").collect()).find(u => u.email === email);
      if (existing) return existing._id;
      return await ctx.runMutation(api.app.createUser, { name, email });
    };

    // Helper: Get or create org (idempotent)
    const getOrCreateOrg = async (name: string, slug: string): Promise<Id<"orgs">> => {
      const existing = (await ctx.db.query("orgs").collect()).find(o => o.slug === slug);
      if (existing) return existing._id;
      return await ctx.runMutation(api.app.createOrg, { name, slug });
    };

    // Helper: Add user to org if not exists (idempotent)
    const addUserToOrgIfNotExists = async (
      userId: Id<"users">,
      orgId: Id<"orgs">,
      role: "admin" | "member"
    ): Promise<void> => {
      const existing = await ctx.db
        .query("org_members")
        .withIndex("by_org_user", (q: any) => q.eq("orgId", orgId).eq("userId", userId))
        .first();
      if (!existing) {
        await ctx.runMutation(api.app.addUserToOrg, { userId, orgId, role });
      }
    };

    // Helper: Get or create resource (idempotent)
    const getOrCreateResource = async (name: string, orgId: Id<"orgs">): Promise<Id<"resources">> => {
      const existing = await ctx.db
        .query("resources")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
      const found = existing.find((r: any) => r.name === name);
      if (found) return found._id;
      return await ctx.runMutation(api.app.createResource, { name, orgId });
    };

    // Helper: Get or create booking (idempotent)
    const getOrCreateBooking = async (
      title: string,
      resourceId: Id<"resources">,
      bookerId: Id<"users">,
      start: string
    ): Promise<Id<"bookings">> => {
      const existing = await ctx.db
        .query("bookings")
        .withIndex("by_resource", (q: any) => q.eq("resourceId", resourceId))
        .collect();
      const found = existing.find((b: any) => b.title === title && b.bookerId === bookerId);
      if (found) return found._id;
      return await ctx.runMutation(api.app.createBooking, { title, resourceId, bookerId, start });
    };

    // Helper: Calculate relative dates
    const addDays = (days: number, hour: number = 0, minute: number = 0): string => {
      const result = new Date();
      result.setDate(result.getDate() + days);
      result.setUTCHours(hour, minute, 0, 0);
      return result.toISOString();
    };

    // 1. Create Organizations
    console.log("🏢 Creating organizations...");
    const acmeId: Id<"orgs"> = await getOrCreateOrg("Acme Studio", "acme");
    const betacoId: Id<"orgs"> = await getOrCreateOrg("BetaCo Studio", "betaco");
    console.log("   ✓ Acme Studio (acme)");
    console.log("   ✓ BetaCo Studio (betaco)");

    // 2. Create Users
    console.log("\n👥 Creating users...");
    const aliceId: Id<"users"> = await getOrCreateUser("Alice", "alice@acme.com");
    const bobId: Id<"users"> = await getOrCreateUser("Bob", "bob@acme.com");
    const charlieId: Id<"users"> = await getOrCreateUser("Charlie", "charlie@betaco.com");
    const dianaId: Id<"users"> = await getOrCreateUser("Diana", "diana@betaco.com");
    console.log("   ✓ Acme: Alice (alice@acme.com), Bob (bob@acme.com)");
    console.log("   ✓ BetaCo: Charlie (charlie@betaco.com), Diana (diana@betaco.com)");

    // 3. Add Users to Orgs
    console.log("\n🔗 Adding users to organizations...");
    await addUserToOrgIfNotExists(aliceId, acmeId, "admin");
    await addUserToOrgIfNotExists(bobId, acmeId, "member");
    await addUserToOrgIfNotExists(charlieId, betacoId, "admin");
    await addUserToOrgIfNotExists(dianaId, betacoId, "member");
    console.log("   ✓ Alice → Acme (admin)");
    console.log("   ✓ Bob → Acme (member)");
    console.log("   ✓ Charlie → BetaCo (admin)");
    console.log("   ✓ Diana → BetaCo (member)");

    // 4. Create Resources
    console.log("\n📦 Creating resources...");
    const studioAId: Id<"resources"> = await getOrCreateResource("Studio A", acmeId);
    const studioBId: Id<"resources"> = await getOrCreateResource("Studio B", acmeId);
    const studioXId: Id<"resources"> = await getOrCreateResource("Studio X", betacoId);
    const studioYId: Id<"resources"> = await getOrCreateResource("Studio Y", betacoId);
    console.log("   ✓ Acme: Studio A, Studio B");
    console.log("   ✓ BetaCo: Studio X, Studio Y");

    // 5. Create External Customers (not in any org)
    console.log("\n👤 Creating external customers...");
    const customerAId: Id<"users"> = await getOrCreateUser("CustomerA", "customer.a@example.com");
    const customerBId: Id<"users"> = await getOrCreateUser("CustomerB", "customer.b@example.com");
    const customerCId: Id<"users"> = await getOrCreateUser("CustomerC", "customer.c@example.com");
    const customerDId: Id<"users"> = await getOrCreateUser("CustomerD", "customer.d@example.com");
    console.log("   ✓ CustomerA, CustomerB, CustomerC, CustomerD (not in any org)");

    // 6. Create Bookings (1 per resource, each by different customer)
    console.log("\n📅 Creating bookings...");
    const bookingA: Id<"bookings"> = await getOrCreateBooking("Morning Session", studioAId, customerAId, addDays(2, 9, 0));
    const bookingB: Id<"bookings"> = await getOrCreateBooking("Afternoon Session", studioBId, customerBId, addDays(3, 14, 0));
    const bookingC: Id<"bookings"> = await getOrCreateBooking("Evening Session", studioXId, customerCId, addDays(5, 18, 0));
    const bookingD: Id<"bookings"> = await getOrCreateBooking("Weekend Session", studioYId, customerDId, addDays(7, 11, 0));
    console.log("   ✓ Studio A: Morning Session (CustomerA)");
    console.log("   ✓ Studio B: Afternoon Session (CustomerB)");
    console.log("   ✓ Studio X: Evening Session (CustomerC)");
    console.log("   ✓ Studio Y: Weekend Session (CustomerD)");

    // 7. Update booking statuses (3 confirmed, 1 pending)
    console.log("\n✏️  Updating booking statuses...");
    await ctx.db.patch(bookingA, { status: "confirmed" });
    await ctx.db.patch(bookingB, { status: "confirmed" });
    await ctx.db.patch(bookingC, { status: "confirmed" });
    // bookingD stays pending
    console.log("   ✓ 3 bookings confirmed, 1 pending");

    // 8. Calculate total tuples created
    // 4 org memberships + 4 resource ownerships + 8 booking relations (4 × 2: parent + booker)
    const totalTuples = 4 + 4 + 8;

    console.log("\n✅ Demo data seed complete!");
    console.log(`   - Org Members: 4 (Alice, Bob, Charlie, Diana)`);
    console.log(`   - External Customers: 4 (CustomerA, B, C, D)`);
    console.log(`   - Organizations: 2`);
    console.log(`   - Resources: 4 (2 per org)`);
    console.log(`   - Bookings: 4 (3 confirmed, 1 pending)`);
    console.log(`   - Zanvex tuples: ${totalTuples} (auto-created via dual-write)\n`);

    return {
      users: {
        acme: [aliceId, bobId],
        betaco: [charlieId, dianaId]
      },
      customers: [customerAId, customerBId, customerCId, customerDId],
      orgs: {
        acme: acmeId,
        betaco: betacoId
      },
      resources: {
        acme: [studioAId, studioBId],
        betaco: [studioXId, studioYId]
      },
      bookings: [bookingA, bookingB, bookingC, bookingD],
      tuples: totalTuples
    };
  },
});

/**
 * Clear demo data
 *
 * Removes all demo users, orgs, resources, and bookings.
 * Zanvex tuples are automatically deleted via app deletion functions.
 *
 * This preserves catalogs (permissions, relations, object types, rules).
 */
export const clearDemoData = mutation({
  args: {},
  returns: v.object({
    bookings: v.number(),
    resources: v.number(),
    memberships: v.number(),
    users: v.number(),
    orgs: v.number(),
    tuples: v.number(),
  }),
  handler: async (ctx) => {
    console.log("🧹 Clearing demo data...\n");

    // Demo identifiers
    const DEMO_USER_EMAILS = [
      "alice@acme.com",
      "bob@acme.com",
      "charlie@betaco.com",
      "diana@betaco.com",
    ];
    const DEMO_ORG_SLUGS = ["acme", "betaco"];
    const DEMO_RESOURCE_NAMES = ["Studio A", "Studio B", "Studio X", "Studio Y"];
    const DEMO_BOOKING_TITLES = [
      "Morning Session",
      "Afternoon Session",
      "Evening Session",
      "Night Session",
      "Weekend Session",
      "Weekday Session",
      "Premium Session",
      "Standard Session",
    ];

    // 1. Delete Bookings (leaf nodes)
    console.log("📅 Deleting bookings...");
    const allBookings = await ctx.db.query("bookings").collect();
    const demoBookings = allBookings.filter((b) => DEMO_BOOKING_TITLES.includes(b.title));
    for (const b of demoBookings) {
      await ctx.runMutation(api.app.deleteBooking, { bookingId: b._id });
    }
    console.log(`   ✓ Deleted ${demoBookings.length} bookings`);

    // 2. Delete Resources
    console.log("📦 Deleting resources...");
    const allResources = await ctx.db.query("resources").collect();
    const demoResources = allResources.filter((r) => DEMO_RESOURCE_NAMES.includes(r.name));
    for (const r of demoResources) {
      await ctx.runMutation(api.app.deleteResource, { resourceId: r._id });
    }
    console.log(`   ✓ Deleted ${demoResources.length} resources`);

    // 3. Delete Org Memberships + Users (users auto-delete memberships)
    console.log("👥 Deleting users...");
    const allUsers = await ctx.db.query("users").collect();
    const demoUsers = allUsers.filter((u) => DEMO_USER_EMAILS.includes(u.email));

    // Count memberships before deletion
    let membershipCount = 0;
    for (const user of demoUsers) {
      const memberships = await ctx.db
        .query("org_members")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      membershipCount += memberships.length;
    }

    for (const u of demoUsers) {
      await ctx.runMutation(api.app.deleteUser, { userId: u._id });
    }
    console.log(`   ✓ Deleted ${demoUsers.length} users`);
    console.log(`   ✓ Deleted ${membershipCount} org memberships (auto-cleanup)`);

    // 4. Delete Organizations
    console.log("🏢 Deleting organizations...");
    const allOrgs = await ctx.db.query("orgs").collect();
    const demoOrgs = allOrgs.filter((o) => DEMO_ORG_SLUGS.includes(o.slug));
    for (const o of demoOrgs) {
      await ctx.runMutation(api.app.deleteOrg, { orgId: o._id });
    }
    console.log(`   ✓ Deleted ${demoOrgs.length} organizations`);

    // 5. Calculate total tuples deleted
    // 4 org memberships + 4 resource ownerships + 16 booking relations
    const totalTuples = membershipCount + demoResources.length + (demoBookings.length * 2);

    console.log("\n✅ Demo data cleared!");
    console.log(`   - Bookings: ${demoBookings.length}`);
    console.log(`   - Resources: ${demoResources.length}`);
    console.log(`   - Org memberships: ${membershipCount}`);
    console.log(`   - Users: ${demoUsers.length}`);
    console.log(`   - Organizations: ${demoOrgs.length}`);
    console.log(`   - Zanvex tuples: ${totalTuples} (auto-deleted)\n`);

    return {
      bookings: demoBookings.length,
      resources: demoResources.length,
      memberships: membershipCount,
      users: demoUsers.length,
      orgs: demoOrgs.length,
      tuples: totalTuples,
    };
  },
});

/**
 * Seed everything at once
 *
 * Optionally includes demo data (2 orgs, 4 users, 4 resources, 8 bookings).
 *
 * Usage:
 *   npx convex run seed:seedAll                                  # Catalogs only
 *   npx convex run seed:seedAll '{"includeDemoData": true}'       # Catalogs + demo data
 */
export const seedAll = mutation({
  args: {
    includeDemoData: v.optional(v.boolean()),
  },
  returns: v.object({
    permissions: v.object({ total: v.number() }),
    relations: v.object({ total: v.number() }),
    demoData: v.optional(v.object({
      users: v.object({
        acme: v.array(v.id("users")),
        betaco: v.array(v.id("users"))
      }),
      customers: v.array(v.id("users")),
      orgs: v.object({
        acme: v.id("orgs"),
        betaco: v.id("orgs")
      }),
      resources: v.object({
        acme: v.array(v.id("resources")),
        betaco: v.array(v.id("resources"))
      }),
      bookings: v.array(v.id("bookings")),
      tuples: v.number(),
    })),
  }),
  handler: async (ctx, args): Promise<{
    permissions: { total: number };
    relations: { total: number };
    demoData?: {
      users: { acme: Id<"users">[]; betaco: Id<"users">[] };
      customers: Id<"users">[];
      orgs: { acme: Id<"orgs">; betaco: Id<"orgs"> };
      resources: { acme: Id<"resources">[]; betaco: Id<"resources">[] };
      bookings: Id<"bookings">[];
      tuples: number;
    };
  }> => {
    console.log("🌱 Starting Zanvex database seed...\n");

    // Step 1: Seed catalogs
    console.log("📋 Seeding catalogs...");
    const permResult: { total: number } = await ctx.runMutation(api.seed.seedPermissions, {});
    const relResult: { total: number } = await ctx.runMutation(api.seed.seedRelations, {});

    // Step 2: Seed object types
    console.log("\n📦 Seeding object types...");
    await ctx.runMutation(api.seed.seedObjectTypes, {});

    // Step 3: Seed permission rules
    console.log("\n🔐 Seeding permission rules...");
    await ctx.runMutation(api.seed.seedPermissionRules, {});

    console.log("\n✅ Catalog seeding complete!");
    console.log(`   - Permissions: ${permResult.total}`);
    console.log(`   - Relations: ${relResult.total}`);
    console.log(`   - Object types: 4 (user, org, resource, booking)`);
    console.log(`   - Permission rules: 6\n`);

    // Step 4: Optional demo data
    let demoResult;
    if (args.includeDemoData) {
      demoResult = await ctx.runMutation(api.seed.seedDemoData, {});
    }

    return {
      permissions: permResult,
      relations: relResult,
      demoData: demoResult,
    };
  },
});

/**
 * Nuclear option: Clear ALL data and re-seed everything fresh
 *
 * WARNING: This is DESTRUCTIVE. It clears:
 * - All app tables (users, orgs, resources, bookings, org_members)
 * - All component tables (permission_catalog, relation_catalog, object_types, permission_rules, tuples)
 *
 * Then re-creates everything from scratch.
 *
 * @param includeDemoData - Whether to seed demo data (default: true)
 */
export const seedFresh = mutation({
  args: {
    includeDemoData: v.optional(v.boolean()),
  },
  handler: async (ctx, { includeDemoData = true }): Promise<{
    permissions?: any;
    relations?: any;
    demoData?: any;
    warning: string;
  }> => {
    console.log("🔥 NUCLEAR SEED: Clearing all data...\n");

    // Clear all app tables
    const appClearResult = await ctx.runMutation(api.app.clearAllData, {});
    console.log(`  Cleared ${appClearResult.deletedUsers + appClearResult.deletedOrgs + appClearResult.deletedResources + appClearResult.deletedBookings + appClearResult.deletedOrgMembers} app records\n`);

    // Clear component tuples using Zanvex's clearAll method
    // This effectively resets the component's authorization state
    console.log("Clearing component tuples...");
    const deletedTuples = await zanvex.clearAll(ctx);
    console.log(`  Deleted ${deletedTuples} tuples`);

    console.log("\n✅ All data cleared\n");
    console.log("🌱 Re-seeding everything from scratch...\n");

    // Re-seed everything
    const result: any = await ctx.runMutation(api.seed.seedAll, {
      includeDemoData
    });

    console.log("\n✅ Fresh seed complete!");
    return {
      ...result,
      warning: "All previous data was destroyed and recreated fresh"
    };
  },
});

