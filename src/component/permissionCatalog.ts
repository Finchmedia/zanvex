import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server.js";

/**
 * Permission Catalog Management
 *
 * Manages the registry of available permissions (CRUD + common actions).
 * Permissions are stored in the database to allow users to add custom
 * domain-specific permissions without editing code.
 */

/**
 * List all active permissions
 *
 * Returns permissions grouped by category (CRUD vs Actions).
 * Used to populate dropdowns in the UI.
 *
 * @example
 * const permissions = await zanvex.listPermissions(ctx);
 * // [
 * //   { name: "create", label: "Create", category: "crud" },
 * //   { name: "cancel", label: "Cancel", category: "action" }
 * // ]
 */
export const listPermissions = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      label: v.string(),
      description: v.optional(v.string()),
      category: v.string(),
    })
  ),
  handler: async (ctx) => {
    const permissions = await ctx.db
      .query("permission_catalog")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return permissions.map((p) => ({
      name: p.name,
      label: p.label,
      description: p.description,
      category: p.category,
    }));
  },
});

/**
 * Register a permission (upsert)
 *
 * If permission already exists, updates it and marks as active.
 * If permission doesn't exist, creates it.
 *
 * This allows users to add custom domain-specific permissions
 * (e.g., "review", "approve", "escalate") beyond the defaults.
 *
 * @example
 * await zanvex.registerPermission(ctx, {
 *   name: "review",
 *   label: "Review",
 *   description: "Review and provide feedback",
 *   category: "action"
 * });
 */
export const registerPermission = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("crud"), v.literal("action")),
  },
  returns: v.id("permission_catalog"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("permission_catalog")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Update existing permission and reactivate it
      await ctx.db.patch(existing._id, {
        label: args.label,
        description: args.description,
        category: args.category,
        isActive: true,
      });
      return existing._id;
    }

    // Create new permission
    return await ctx.db.insert("permission_catalog", {
      name: args.name,
      label: args.label,
      description: args.description,
      category: args.category,
      isActive: true,
    });
  },
});

/**
 * Deactivate a permission (soft delete)
 *
 * Marks permission as inactive without deleting it.
 * This prevents breaking existing permission rules that reference it.
 *
 * @example
 * await zanvex.deactivatePermission(ctx, { name: "obsolete-action" });
 */
export const deactivatePermission = mutation({
  args: {
    name: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const permission = await ctx.db
      .query("permission_catalog")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!permission) {
      return false;
    }

    await ctx.db.patch(permission._id, { isActive: false });
    return true;
  },
});

/**
 * Initialize default permissions
 *
 * Seeds the permission catalog with standard CRUD operations
 * and common actions. Safe to call multiple times (idempotent).
 *
 * Default permissions:
 * - CRUD: create, read, update, delete
 * - Actions: cancel, reschedule, approve, reject, publish, archive
 *
 * This should be called during app initialization.
 */
export const initializePermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const permissions = [
      // CRUD Operations
      {
        name: "create",
        label: "Create",
        description: "Create new instances",
        category: "crud" as const,
      },
      {
        name: "read",
        label: "Read",
        description: "View/read instances",
        category: "crud" as const,
      },
      {
        name: "update",
        label: "Update",
        description: "Modify existing instances",
        category: "crud" as const,
      },
      {
        name: "delete",
        label: "Delete",
        description: "Remove instances",
        category: "crud" as const,
      },
      // Common Actions
      {
        name: "cancel",
        label: "Cancel",
        description: "Cancel/revoke an action",
        category: "action" as const,
      },
      {
        name: "reschedule",
        label: "Reschedule",
        description: "Change timing",
        category: "action" as const,
      },
      {
        name: "approve",
        label: "Approve",
        description: "Grant approval",
        category: "action" as const,
      },
      {
        name: "reject",
        label: "Reject",
        description: "Deny/reject",
        category: "action" as const,
      },
      {
        name: "publish",
        label: "Publish",
        description: "Make public",
        category: "action" as const,
      },
      {
        name: "archive",
        label: "Archive",
        description: "Archive/deactivate",
        category: "action" as const,
      },
    ];

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
      }
    }
  },
});
