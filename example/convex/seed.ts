/**
 * Seed Script for Zanvex Catalogs
 *
 * Run this to populate the permission_catalog and relation_catalog tables
 * with default values.
 *
 * Usage:
 *   npx convex run seed:seedAll
 *
 * Or seed individually:
 *   npx convex run seed:seedPermissions
 *   npx convex run seed:seedRelations
 *   npx convex run seed:seedObjectTypes
 *   npx convex run seed:seedPermissionRules
 */

import { mutation } from "./_generated/server.js";
import { api } from "./_generated/api.js";
import { createZanvexClient } from "@mrfinch/zanvex";
import { components } from "./_generated/api.js";

const zanvex = createZanvexClient(components.zanvex);

/**
 * Seed permission catalog with CRUD + common actions
 */
export const seedPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    const permissions = [
      // CRUD Operations
      { name: "create", label: "Create", description: "Create new instances", category: "crud" as const },
      { name: "read", label: "Read", description: "View/read instances", category: "crud" as const },
      { name: "update", label: "Update", description: "Modify existing instances", category: "crud" as const },
      { name: "delete", label: "Delete", description: "Remove instances", category: "crud" as const },

      // Common Actions
      { name: "view", label: "View", description: "View/access", category: "action" as const },
      { name: "edit", label: "Edit", description: "Edit/modify", category: "action" as const },
      { name: "cancel", label: "Cancel", description: "Cancel/revoke an action", category: "action" as const },
      { name: "reschedule", label: "Reschedule", description: "Change timing", category: "action" as const },
      { name: "approve", label: "Approve", description: "Grant approval", category: "action" as const },
      { name: "reject", label: "Reject", description: "Deny/reject", category: "action" as const },
      { name: "publish", label: "Publish", description: "Make public", category: "action" as const },
      { name: "archive", label: "Archive", description: "Archive/deactivate", category: "action" as const },
    ];

    for (const perm of permissions) {
      await zanvex.registerPermission(ctx, perm);
    }

    console.log(`Seeded ${permissions.length} permissions`);
    return { total: permissions.length };
  },
});

/**
 * Seed relation catalog with common ReBAC patterns
 */
export const seedRelations = mutation({
  args: {},
  handler: async (ctx) => {
    const relationNames = [
      // Structural relations
      { name: "parent", label: "parent", description: "Parent/container relation" },
      { name: "owner", label: "owner", description: "Ownership relation" },
      { name: "child", label: "child", description: "Child/contained relation" },

      // Membership relations
      { name: "member_of", label: "member_of", description: "Membership relation" },
      { name: "admin_of", label: "admin_of", description: "Admin/manager relation" },

      // Assignment relations
      { name: "booker", label: "booker", description: "Who made the booking" },
      { name: "assignee", label: "assignee", description: "Who is assigned/responsible" },
      { name: "creator", label: "creator", description: "Who created this instance" },

      // Permission-based relations
      { name: "viewer", label: "viewer", description: "Who can view" },
      { name: "editor", label: "editor", description: "Who can edit" },
      { name: "collaborator", label: "collaborator", description: "Who can collaborate" },
    ];

    for (const rel of relationNames) {
      await zanvex.registerRelationName(ctx, rel);
    }

    console.log(`Seeded ${relationNames.length} relations`);
    return { total: relationNames.length };
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
 * Seed everything at once
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Starting Zanvex database seed...\n");

    // Step 1: Seed catalogs
    console.log("📋 Seeding catalogs...");
    const permResult = await ctx.runMutation(api.seed.seedPermissions, {});
    const relResult = await ctx.runMutation(api.seed.seedRelations, {});

    // Step 2: Seed object types
    console.log("\n📦 Seeding object types...");
    await ctx.runMutation(api.seed.seedObjectTypes, {});

    // Step 3: Seed permission rules
    console.log("\n🔐 Seeding permission rules...");
    await ctx.runMutation(api.seed.seedPermissionRules, {});

    console.log("\n✅ Database seeding complete!");
    console.log(`   - Permissions: ${permResult.total}`);
    console.log(`   - Relations: ${relResult.total}`);
    console.log(`   - Object types: 4 (user, org, resource, booking)`);
    console.log(`   - Permission rules: 6\n`);

    return {
      permissions: permResult,
      relations: relResult,
    };
  },
});

