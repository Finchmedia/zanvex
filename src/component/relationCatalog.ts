import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server.js";

/**
 * Relation Name Catalog Management
 *
 * Manages the registry of common relation names for ReBAC patterns.
 * Provides suggestions for object type relations and ensures consistency
 * across the schema.
 */

/**
 * List all active relation names
 *
 * Returns relation names available for use in object type definitions.
 * Used to populate dropdowns in the Object Types UI.
 *
 * @example
 * const relationNames = await zanvex.listRelationNames(ctx);
 * // [
 * //   { name: "parent", label: "parent", description: "Parent/container relation" },
 * //   { name: "owner", label: "owner", description: "Ownership relation" }
 * // ]
 */
export const listRelationNames = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      label: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const relationNames = await ctx.db
      .query("relation_catalog")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return relationNames.map((r) => ({
      name: r.name,
      label: r.label,
      description: r.description,
    }));
  },
});

/**
 * Register a relation name (upsert)
 *
 * If relation name already exists, updates it and marks as active.
 * If relation name doesn't exist, creates it.
 *
 * This allows users to add domain-specific relation names
 * (e.g., "reviewer", "collaborator", "supervisor") beyond the defaults.
 *
 * @example
 * await zanvex.registerRelationName(ctx, {
 *   name: "reviewer",
 *   label: "reviewer",
 *   description: "Who reviews this instance"
 * });
 */
export const registerRelationName = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("relation_catalog"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("relation_catalog")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing relation name and reactivate it
      await ctx.db.patch(existing._id, {
        label: args.label,
        description: args.description,
        isActive: true,
      });
      return existing._id;
    }

    // Create new relation name
    return await ctx.db.insert("relation_catalog", {
      name: args.name,
      label: args.label,
      description: args.description,
      isActive: true,
    });
  },
});

/**
 * Deactivate a relation name (soft delete)
 *
 * Marks relation name as inactive without deleting it.
 * This prevents breaking existing object types that reference it.
 *
 * @example
 * await zanvex.deactivateRelationName(ctx, { name: "obsolete-relation" });
 */
export const deactivateRelationName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const relationName = await ctx.db
      .query("relation_catalog")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!relationName) {
      return false;
    }

    await ctx.db.patch(relationName._id, { isActive: false });
    return true;
  },
});

/**
 * Initialize default relation names
 *
 * Seeds the relation catalog with common ReBAC patterns.
 * Safe to call multiple times (idempotent).
 *
 * Default relations:
 * - Structural: parent, owner
 * - Membership: member_of, admin_of
 * - Assignments: booker, assignee, creator
 * - Permissions: viewer, editor
 *
 * This should be called during app initialization.
 */
export const initializeRelationNames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const relationNames = [
      {
        name: "parent",
        label: "parent",
        description: "Parent/container relation",
      },
      {
        name: "owner",
        label: "owner",
        description: "Ownership relation",
      },
      {
        name: "member_of",
        label: "member_of",
        description: "Membership relation",
      },
      {
        name: "admin_of",
        label: "admin_of",
        description: "Admin/manager relation",
      },
      {
        name: "booker",
        label: "booker",
        description: "Who made the booking",
      },
      {
        name: "assignee",
        label: "assignee",
        description: "Who is assigned/responsible",
      },
      {
        name: "creator",
        label: "creator",
        description: "Who created this instance",
      },
      {
        name: "viewer",
        label: "viewer",
        description: "Who can view",
      },
      {
        name: "editor",
        label: "editor",
        description: "Who can edit",
      },
    ];

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
      }
    }
  },
});
