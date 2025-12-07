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

import { internalMutation } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";

/**
 * Seed permission catalog with CRUD + common actions
 */
export const seedPermissions = internalMutation({
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

    let created = 0;
    for (const perm of permissions) {
      const existing = await ctx.db
        .query("permission_catalog")
        .withIndex("by_name", (q) => q.eq("name", perm.name))
        .first();

      if (!existing) {
        await ctx.db.insert("permission_catalog", {
          ...perm,
          isActive: true,
        });
        created++;
      }
    }

    console.log(`Seeded ${created} permissions (${permissions.length - created} already existed)`);
    return { created, total: permissions.length };
  },
});

/**
 * Seed relation catalog with common ReBAC patterns
 */
export const seedRelations = internalMutation({
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

    let created = 0;
    for (const rel of relationNames) {
      const existing = await ctx.db
        .query("relation_catalog")
        .withIndex("by_name", (q) => q.eq("name", rel.name))
        .first();

      if (!existing) {
        await ctx.db.insert("relation_catalog", {
          ...rel,
          isActive: true,
        });
        created++;
      }
    }

    console.log(`Seeded ${created} relations (${relationNames.length - created} already existed)`);
    return { created, total: relationNames.length };
  },
});

/**
 * Seed object types for booking system example
 */
export const seedObjectTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.app.initializeObjectTypes, {});
    console.log("Seeded object types (user, org, resource, booking)");
  },
});

/**
 * Seed permission rules for booking system example
 */
export const seedPermissionRules = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.app.initializePermissionRules, {});
    console.log("Seeded permission rules");
  },
});

/**
 * Seed everything at once
 */
export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Starting Zanvex database seed...\n");

    // Step 1: Seed catalogs
    console.log("📋 Seeding catalogs...");
    const permResult = await ctx.runMutation(internal.seed.seedPermissions, {});
    const relResult = await ctx.runMutation(internal.seed.seedRelations, {});

    // Step 2: Seed object types
    console.log("\n📦 Seeding object types...");
    await ctx.runMutation(internal.seed.seedObjectTypes, {});

    // Step 3: Seed permission rules
    console.log("\n🔐 Seeding permission rules...");
    await ctx.runMutation(internal.seed.seedPermissionRules, {});

    console.log("\n✅ Database seeding complete!");
    console.log(`   - Permissions: ${permResult.created}/${permResult.total} created`);
    console.log(`   - Relations: ${relResult.created}/${relResult.total} created`);
    console.log(`   - Object types: 4 (user, org, resource, booking)`);
    console.log(`   - Permission rules: 6\n`);

    return {
      permissions: permResult,
      relations: relResult,
    };
  },
});

/**
 * Clear all catalog data (use with caution!)
 */
export const clearCatalogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const permissions = await ctx.db.query("permission_catalog").collect();
    const relations = await ctx.db.query("relation_catalog").collect();

    for (const p of permissions) await ctx.db.delete(p._id);
    for (const r of relations) await ctx.db.delete(r._id);

    console.log(`Cleared ${permissions.length} permissions and ${relations.length} relations`);
    return { permissions: permissions.length, relations: relations.length };
  },
});
