import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

/**
 * Permission Schema Management
 *
 * These functions manage the permission schema - the rules that define
 * what each relation (admin_of, member_of, etc.) can do.
 *
 * Example usage:
 *   setPermissions("admin_of", ["create", "read", "update", "delete"])
 *   setPermissions("member_of", ["read"])
 *
 *   can(user, "delete", resource) → checks if user's relation grants "delete"
 */

// Standard CRUD actions
export const ACTIONS = ["create", "read", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Set permissions for a relation (upsert)
 *
 * If the relation already exists, updates its actions.
 * If not, creates a new entry.
 */
export const setPermissions = mutation({
  args: {
    relation: v.string(),
    actions: v.array(v.string()),
  },
  returns: v.id("permission_schema"),
  handler: async (ctx, { relation, actions }) => {
    // Check if relation already exists
    const existing = await ctx.db
      .query("permission_schema")
      .withIndex("by_relation", (q) => q.eq("relation", relation))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { actions });
      return existing._id;
    }

    return await ctx.db.insert("permission_schema", { relation, actions });
  },
});

/**
 * Get permissions for a relation
 */
export const getPermissions = query({
  args: {
    relation: v.string(),
  },
  returns: v.union(
    v.object({
      relation: v.string(),
      actions: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { relation }) => {
    const schema = await ctx.db
      .query("permission_schema")
      .withIndex("by_relation", (q) => q.eq("relation", relation))
      .first();

    if (!schema) return null;

    return {
      relation: schema.relation,
      actions: schema.actions,
    };
  },
});

/**
 * List all permission schemas
 */
export const listPermissions = query({
  args: {},
  returns: v.array(
    v.object({
      relation: v.string(),
      actions: v.array(v.string()),
    })
  ),
  handler: async (ctx) => {
    const schemas = await ctx.db.query("permission_schema").collect();
    return schemas.map((s) => ({
      relation: s.relation,
      actions: s.actions,
    }));
  },
});

/**
 * Delete a permission schema
 */
export const deletePermissions = mutation({
  args: {
    relation: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { relation }) => {
    const existing = await ctx.db
      .query("permission_schema")
      .withIndex("by_relation", (q) => q.eq("relation", relation))
      .first();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});

/**
 * Initialize default permissions
 *
 * Call this once to set up sensible defaults:
 *   admin_of: can do everything
 *   member_of: can only read
 */
export const initializeDefaults = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if already initialized
    const existing = await ctx.db.query("permission_schema").first();
    if (existing) return null;

    // Set up defaults
    await ctx.db.insert("permission_schema", {
      relation: "admin_of",
      actions: ["create", "read", "update", "delete"],
    });

    await ctx.db.insert("permission_schema", {
      relation: "member_of",
      actions: ["read"],
    });

    return null;
  },
});

/**
 * The main "can" check - uses permission schema
 *
 * This is the magic function that answers:
 * "Can this user perform this action on this object?"
 *
 * Steps:
 * 1. Find the path from subject to object (what relation grants access?)
 * 2. Look up that relation in permission_schema
 * 3. Check if the requested action is in the actions array
 */
export const can = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    action: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    relation: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Step 1: Find how the subject is connected to the object
    // First, direct check
    const directRelations = await ctx.db
      .query("relations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();

    // Check if any direct relation grants access to this object
    for (const rel of directRelations) {
      if (rel.objectType === args.objectType && rel.objectId === args.objectId) {
        // Direct relation found, check permissions
        const schema = await ctx.db
          .query("permission_schema")
          .withIndex("by_relation", (q) => q.eq("relation", rel.relation))
          .first();

        if (schema && schema.actions.includes(args.action)) {
          return {
            allowed: true,
            reason: `Direct ${rel.relation} grants ${args.action}`,
            relation: rel.relation,
          };
        }
      }
    }

    // Step 2: 1-hop traversal - find memberships
    const memberships = directRelations.filter(
      (t) =>
        t.relation === "member_of" ||
        t.relation === "admin_of" ||
        t.relation === "editor" ||
        t.relation === "viewer"
    );

    // Step 3: Check if any membership grants access via ownership
    for (const membership of memberships) {
      // Find if this org/group owns the target object
      const ownershipRelations = await ctx.db
        .query("relations")
        .withIndex("by_object", (q) =>
          q
            .eq("objectType", args.objectType)
            .eq("objectId", args.objectId)
            .eq("relation", "owner")
        )
        .collect();

      for (const ownership of ownershipRelations) {
        if (
          ownership.subjectType === membership.objectType &&
          ownership.subjectId === membership.objectId
        ) {
          // Found path: subject → membership.relation → org → owner → object
          // Check if membership.relation grants the action
          const schema = await ctx.db
            .query("permission_schema")
            .withIndex("by_relation", (q) => q.eq("relation", membership.relation))
            .first();

          if (schema && schema.actions.includes(args.action)) {
            return {
              allowed: true,
              reason: `${membership.relation} via ${membership.objectType} grants ${args.action}`,
              relation: membership.relation,
            };
          } else if (schema) {
            // Has access but not for this action
            return {
              allowed: false,
              reason: `${membership.relation} does not grant ${args.action}`,
              relation: membership.relation,
            };
          }
        }
      }
    }

    return {
      allowed: false,
      reason: "No access path found",
    };
  },
});

/**
 * Check multiple actions at once for a user+object
 *
 * Returns which actions are allowed (useful for UI)
 */
export const getPermissionsForObject = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.object({
    create: v.boolean(),
    read: v.boolean(),
    update: v.boolean(),
    delete: v.boolean(),
    relation: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const result = {
      create: false,
      read: false,
      update: false,
      delete: false,
      relation: undefined as string | undefined,
    };

    // Find the relation that grants access
    // First, direct check
    const directRelations = await ctx.db
      .query("relations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();

    // Check direct relations
    for (const rel of directRelations) {
      if (rel.objectType === args.objectType && rel.objectId === args.objectId) {
        const schema = await ctx.db
          .query("permission_schema")
          .withIndex("by_relation", (q) => q.eq("relation", rel.relation))
          .first();

        if (schema) {
          result.relation = rel.relation;
          result.create = schema.actions.includes("create");
          result.read = schema.actions.includes("read");
          result.update = schema.actions.includes("update");
          result.delete = schema.actions.includes("delete");
          return result;
        }
      }
    }

    // 1-hop traversal
    const memberships = directRelations.filter(
      (t) =>
        t.relation === "member_of" ||
        t.relation === "admin_of" ||
        t.relation === "editor" ||
        t.relation === "viewer"
    );

    for (const membership of memberships) {
      const ownershipRelations = await ctx.db
        .query("relations")
        .withIndex("by_object", (q) =>
          q
            .eq("objectType", args.objectType)
            .eq("objectId", args.objectId)
            .eq("relation", "owner")
        )
        .collect();

      for (const ownership of ownershipRelations) {
        if (
          ownership.subjectType === membership.objectType &&
          ownership.subjectId === membership.objectId
        ) {
          const schema = await ctx.db
            .query("permission_schema")
            .withIndex("by_relation", (q) => q.eq("relation", membership.relation))
            .first();

          if (schema) {
            result.relation = membership.relation;
            result.create = schema.actions.includes("create");
            result.read = schema.actions.includes("read");
            result.update = schema.actions.includes("update");
            result.delete = schema.actions.includes("delete");
            return result;
          }
        }
      }
    }

    return result;
  },
});
