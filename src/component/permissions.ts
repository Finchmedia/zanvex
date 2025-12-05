import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

/**
 * Permission Schema Management
 *
 * These functions manage the permission schema - the rules that define
 * what each relation (admin_of, member_of, etc.) can do per object type.
 *
 * Example usage:
 *   setPermissions("admin_of", "*", ["create", "read", "update", "delete"])
 *   setPermissions("member_of", "resource", ["read"])
 *   setPermissions("member_of", "booking", ["read", "cancel"])
 *   setPermissions("booker", "booking", ["read", "cancel"])
 *
 *   can(user, "cancel", booking) → checks if user's relation grants "cancel" for booking type
 *
 * objectType: "*" means "applies to all object types" (default/fallback)
 */

// Standard CRUD actions + custom actions
export const ACTIONS = ["create", "read", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Helper to look up permissions for a (relation, objectType) pair
 * Falls back to wildcard "*" if no specific objectType match
 */
async function lookupPermissions(
  ctx: any,
  relation: string,
  objectType: string
) {
  // First try exact match
  const exact = await ctx.db
    .query("permission_schema")
    .withIndex("by_relation_objectType", (q: any) =>
      q.eq("relation", relation).eq("objectType", objectType)
    )
    .first();

  if (exact) return exact;

  // Fall back to wildcard
  const wildcard = await ctx.db
    .query("permission_schema")
    .withIndex("by_relation_objectType", (q: any) =>
      q.eq("relation", relation).eq("objectType", "*")
    )
    .first();

  return wildcard;
}

/**
 * Set permissions for a relation + objectType (upsert)
 *
 * If the (relation, objectType) already exists, updates its actions.
 * If not, creates a new entry.
 *
 * @param relation - The relation name (e.g., "admin_of", "member_of", "booker")
 * @param objectType - The object type (e.g., "resource", "booking", "*" for all)
 * @param actions - Array of allowed actions (e.g., ["read", "cancel"])
 */
export const setPermissions = mutation({
  args: {
    relation: v.string(),
    objectType: v.optional(v.string()), // defaults to "*"
    actions: v.array(v.string()),
  },
  returns: v.id("permission_schema"),
  handler: async (ctx, { relation, objectType = "*", actions }) => {
    // Check if (relation, objectType) already exists
    const existing = await ctx.db
      .query("permission_schema")
      .withIndex("by_relation_objectType", (q) =>
        q.eq("relation", relation).eq("objectType", objectType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { actions });
      return existing._id;
    }

    return await ctx.db.insert("permission_schema", {
      relation,
      objectType,
      actions,
    });
  },
});

/**
 * Get permissions for a relation (optionally for specific objectType)
 */
export const getPermissions = query({
  args: {
    relation: v.string(),
    objectType: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      relation: v.string(),
      objectType: v.string(),
      actions: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { relation, objectType }) => {
    let schema;

    if (objectType) {
      // Look up with fallback to wildcard
      schema = await lookupPermissions(ctx, relation, objectType);
    } else {
      // Just get first match for this relation
      schema = await ctx.db
        .query("permission_schema")
        .withIndex("by_relation", (q) => q.eq("relation", relation))
        .first();
    }

    if (!schema) return null;

    return {
      relation: schema.relation,
      objectType: schema.objectType,
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
      objectType: v.string(),
      actions: v.array(v.string()),
    })
  ),
  handler: async (ctx) => {
    const schemas = await ctx.db.query("permission_schema").collect();
    return schemas.map((s) => ({
      relation: s.relation,
      objectType: s.objectType,
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
    objectType: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, { relation, objectType = "*" }) => {
    const existing = await ctx.db
      .query("permission_schema")
      .withIndex("by_relation_objectType", (q) =>
        q.eq("relation", relation).eq("objectType", objectType)
      )
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
 *   admin_of on * : can do everything
 *   member_of on * : can only read
 *   booker on booking : can read and cancel
 */
export const initializeDefaults = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if already initialized
    const existing = await ctx.db.query("permission_schema").first();
    if (existing) return null;

    // Set up defaults - admin can do everything on all types
    await ctx.db.insert("permission_schema", {
      relation: "admin_of",
      objectType: "*",
      actions: ["create", "read", "update", "delete"],
    });

    // member can only read on all types
    await ctx.db.insert("permission_schema", {
      relation: "member_of",
      objectType: "*",
      actions: ["read"],
    });

    // booker can read and cancel their own bookings
    await ctx.db.insert("permission_schema", {
      relation: "booker",
      objectType: "booking",
      actions: ["read", "cancel"],
    });

    return null;
  },
});

/**
 * The main "can" check - uses permission schema with objectType
 *
 * This is the magic function that answers:
 * "Can this user perform this action on this object?"
 *
 * Steps:
 * 1. Find the path from subject to object (what relation grants access?)
 * 2. Look up (relation, objectType) in permission_schema (falls back to wildcard)
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
        // Direct relation found, check permissions with objectType
        const schema = await lookupPermissions(ctx, rel.relation, args.objectType);

        if (schema && schema.actions.includes(args.action)) {
          return {
            allowed: true,
            reason: `Direct ${rel.relation} on ${args.objectType} grants ${args.action}`,
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
          // Check if membership.relation grants the action for this objectType
          const schema = await lookupPermissions(
            ctx,
            membership.relation,
            args.objectType
          );

          if (schema && schema.actions.includes(args.action)) {
            return {
              allowed: true,
              reason: `${membership.relation} on ${args.objectType} via ${membership.objectType} grants ${args.action}`,
              relation: membership.relation,
            };
          } else if (schema) {
            // Has access but not for this action
            return {
              allowed: false,
              reason: `${membership.relation} on ${args.objectType} does not grant ${args.action}`,
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
 * Now supports custom actions beyond CRUD
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
    cancel: v.boolean(), // Added for bookings
    actions: v.array(v.string()), // Full list of allowed actions
    relation: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const result = {
      create: false,
      read: false,
      update: false,
      delete: false,
      cancel: false,
      actions: [] as string[],
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
        const schema = await lookupPermissions(ctx, rel.relation, args.objectType);

        if (schema) {
          result.relation = rel.relation;
          result.actions = schema.actions;
          result.create = schema.actions.includes("create");
          result.read = schema.actions.includes("read");
          result.update = schema.actions.includes("update");
          result.delete = schema.actions.includes("delete");
          result.cancel = schema.actions.includes("cancel");
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
          const schema = await lookupPermissions(
            ctx,
            membership.relation,
            args.objectType
          );

          if (schema) {
            result.relation = membership.relation;
            result.actions = schema.actions;
            result.create = schema.actions.includes("create");
            result.read = schema.actions.includes("read");
            result.update = schema.actions.includes("update");
            result.delete = schema.actions.includes("delete");
            result.cancel = schema.actions.includes("cancel");
            return result;
          }
        }
      }
    }

    return result;
  },
});
