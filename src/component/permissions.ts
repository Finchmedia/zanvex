import { v } from "convex/values";
import { query } from "./_generated/server.js";

/**
 * Permission Checks (Zanzibar-style Recursive Traversal)
 *
 * This module implements the core permission checking logic using
 * schema-driven recursive traversal through the object graph.
 *
 * Key concepts:
 * - Relations are stored tuples: (object, relation, subject)
 * - Permissions are computed from rules defined in permission_rules table
 * - If no rule exists for a permission, it's treated as a direct relation check
 *
 * Example flow for can(user:daniel, cancel, booking:123):
 *   1. Look up rule: booking.cancel = "parent->edit | booker"
 *   2. Evaluate "booker": Direct tuple check → (booking:123, booker, user:daniel)?
 *   3. Evaluate "parent->edit":
 *      - Find booking's parent relation → resource:studio-a
 *      - Recursively: can(daniel, edit, resource:studio-a)
 *   4. Return true if any path succeeds
 */

const MAX_DEPTH = 10;

/**
 * Check if a subject can perform an action/permission on an object
 *
 * This is the main API for permission checks.
 *
 * @example
 * // Can daniel cancel booking 123?
 * const result = await zanvex.can(ctx, {
 *   subject: { type: "user", id: "daniel" },
 *   action: "cancel",
 *   object: { type: "booking", id: "booking-123" },
 * });
 *
 * if (!result.allowed) {
 *   throw new Error(`Forbidden: ${result.reason}`);
 * }
 */
export const can = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    action: v.string(), // The permission to check (e.g., "view", "edit", "cancel")
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    path: v.optional(v.array(v.string())), // Debug: traversal path taken
  }),
  handler: async (ctx, args) => {
    return await canRecursive(ctx, args, 0, []);
  },
});

/**
 * Internal recursive implementation of permission checking
 */
async function canRecursive(
  ctx: any,
  args: {
    objectType: string;
    objectId: string;
    action: string;
    subjectType: string;
    subjectId: string;
  },
  depth: number,
  path: string[]
): Promise<{ allowed: boolean; reason?: string; path?: string[] }> {
  // Prevent infinite loops
  if (depth > MAX_DEPTH) {
    return {
      allowed: false,
      reason: "Max traversal depth exceeded",
      path,
    };
  }

  const currentPath = [
    ...path,
    `${args.objectType}:${args.objectId}.${args.action}`,
  ];

  // 1. Look up permission rule for this (objectType, permission)
  const rule = await ctx.db
    .query("permission_rules")
    .withIndex("by_type_permission", (q: any) =>
      q.eq("objectType", args.objectType).eq("permission", args.action)
    )
    .first();

  // 2. No rule? Default to direct relation check
  if (!rule) {
    const direct = await checkDirectTuple(ctx, {
      objectType: args.objectType,
      objectId: args.objectId,
      relation: args.action, // Use action as relation name
      subjectType: args.subjectType,
      subjectId: args.subjectId,
    });

    return {
      allowed: direct,
      reason: direct
        ? `Direct ${args.action} relation`
        : `No ${args.action} relation found`,
      path: currentPath,
    };
  }

  // 3. Evaluate rules (OR logic - any matching rule grants access)
  for (const part of rule.rules) {
    if (part.type === "direct") {
      // Check for direct relation tuple
      const hasTuple = await checkDirectTuple(ctx, {
        objectType: args.objectType,
        objectId: args.objectId,
        relation: part.relation!,
        subjectType: args.subjectType,
        subjectId: args.subjectId,
      });

      if (hasTuple) {
        return {
          allowed: true,
          reason: `Direct ${part.relation} relation`,
          path: currentPath,
        };
      }
    } else if (part.type === "computed") {
      // Find related objects via sourceRelation
      const related = await ctx.db
        .query("tuples")
        .withIndex("by_object", (q: any) =>
          q
            .eq("objectType", args.objectType)
            .eq("objectId", args.objectId)
            .eq("relation", part.sourceRelation)
        )
        .collect();

      // Recursively check permission on each related object
      for (const rel of related) {
        const result = await canRecursive(
          ctx,
          {
            objectType: rel.subjectType,
            objectId: rel.subjectId,
            action: part.targetPermission!,
            subjectType: args.subjectType,
            subjectId: args.subjectId,
          },
          depth + 1,
          currentPath
        );

        if (result.allowed) {
          return {
            allowed: true,
            reason: `${part.sourceRelation}->${part.targetPermission}`,
            path: result.path,
          };
        }
      }
    }
  }

  return {
    allowed: false,
    reason: "No matching rule granted access",
    path: currentPath,
  };
}

/**
 * Check if a direct relation tuple exists
 */
async function checkDirectTuple(
  ctx: any,
  args: {
    objectType: string;
    objectId: string;
    relation: string;
    subjectType: string;
    subjectId: string;
  }
): Promise<boolean> {
  const tuple = await ctx.db
    .query("tuples")
    .withIndex("by_tuple", (q: any) =>
      q
        .eq("objectType", args.objectType)
        .eq("objectId", args.objectId)
        .eq("relation", args.relation)
        .eq("subjectType", args.subjectType)
        .eq("subjectId", args.subjectId)
    )
    .first();

  return !!tuple;
}

/**
 * Get all permissions a subject has on an object
 *
 * Checks common CRUD permissions plus any custom permissions defined in rules.
 * Returns which actions are allowed.
 *
 * @example
 * const perms = await zanvex.getPermissionsForObject(ctx, {
 *   subject: { type: "user", id: "daniel" },
 *   object: { type: "booking", id: "booking-123" },
 * });
 * // { view: true, edit: false, delete: false, cancel: true, actions: ["view", "cancel"] }
 */
export const getPermissionsForObject = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.object({
    // Standard CRUD permissions
    create: v.boolean(),
    read: v.boolean(),
    update: v.boolean(),
    delete: v.boolean(),
    // Common custom permissions
    view: v.boolean(),
    edit: v.boolean(),
    cancel: v.boolean(),
    // Full list of allowed actions
    actions: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Standard permissions to check
    const standardPermissions = [
      "create",
      "read",
      "update",
      "delete",
      "view",
      "edit",
      "cancel",
    ];

    // Also get any custom permissions defined for this object type
    const rules = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q: any) =>
        q.eq("objectType", args.objectType)
      )
      .collect();

    const customPermissions = rules.map((r: any) => r.permission);
    const allPermissions = [
      ...new Set([...standardPermissions, ...customPermissions]),
    ];

    // Check each permission
    const results: Record<string, boolean> = {};
    const allowedActions: string[] = [];

    for (const permission of allPermissions) {
      const result = await canRecursive(
        ctx,
        {
          objectType: args.objectType,
          objectId: args.objectId,
          action: permission,
          subjectType: args.subjectType,
          subjectId: args.subjectId,
        },
        0,
        []
      );

      results[permission] = result.allowed;
      if (result.allowed) {
        allowedActions.push(permission);
      }
    }

    return {
      create: results["create"] ?? false,
      read: results["read"] ?? false,
      update: results["update"] ?? false,
      delete: results["delete"] ?? false,
      view: results["view"] ?? false,
      edit: results["edit"] ?? false,
      cancel: results["cancel"] ?? false,
      actions: allowedActions,
    };
  },
});
