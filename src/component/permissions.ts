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
 * Path Tracking Types for Traversal Visualization
 */

/** Represents a node in the permission check traversal path */
interface TraversalNode {
  nodeType: string;      // "user", "org", "resource", "booking"
  nodeId: string;        // ID of the node
  relation?: string;     // Relation used to reach this node ("admin_of", "owner", "parent")
  permission?: string;   // Permission checked at this node (for computed permissions)
  depth: number;         // Depth in traversal (0 = starting point)
}

/** Represents an attempted path that failed during permission check */
interface TriedPath {
  rulePart: string;           // Which DSL rule part was tried (e.g., "parent->edit")
  failureReason: string;      // Why it failed
  partialPath?: TraversalNode[]; // How far we got before failing
}

/** Enhanced result with full traversal path information */
interface PathResult {
  allowed: boolean;
  reason: string;               // Human-readable explanation
  matchedRule?: string;         // DSL expression that succeeded (e.g., "parent->edit")
  path?: TraversalNode[];       // Only present if allowed - the successful path
  triedPaths?: TriedPath[];     // Only present if denied - failed attempts
}

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
 * Check permissions with detailed traversal path information
 *
 * Returns rich debugging information including:
 * - Exact path taken through object graph
 * - Which rule granted access
 * - Detailed failure information (if denied)
 *
 * Use this for debugging, audit logs, or UI permission explorers/graphs.
 *
 * @example
 * // Check with full path tracking
 * const result = await zanvex.canWithPath(ctx, {
 *   subject: { type: "user", id: "daniel" },
 *   action: "cancel",
 *   object: { type: "booking", id: "booking-123" },
 * });
 *
 * if (result.allowed) {
 *   console.log("Allowed via:", result.matchedRule);
 *   console.log("Path:", result.path);
 * } else {
 *   console.log("Denied. Tried:", result.triedPaths);
 * }
 */
export const canWithPath = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    action: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.string(),
    matchedRule: v.optional(v.string()),
    path: v.optional(v.array(v.object({
      nodeType: v.string(),
      nodeId: v.string(),
      relation: v.optional(v.string()),
      permission: v.optional(v.string()),
      depth: v.number()
    }))),
    triedPaths: v.optional(v.array(v.object({
      rulePart: v.string(),
      failureReason: v.string(),
      partialPath: v.optional(v.array(v.object({
        nodeType: v.string(),
        nodeId: v.string(),
        relation: v.optional(v.string()),
        permission: v.optional(v.string()),
        depth: v.number()
      })))
    })))
  }),
  handler: async (ctx, args) => {
    return await canRecursiveWithPath(ctx, args, 0, [], []);
  },
});

/**
 * Internal recursive implementation of permission checking
 *
 * This is a simplified wrapper around canRecursiveWithPath that
 * returns a simplified result (string path instead of TraversalNode array).
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
  // Use the full implementation and simplify the result
  const result = await canRecursiveWithPath(ctx, args, depth, [], []);

  // Convert TraversalNode[] to string[] for backwards compatibility
  const simplePath = result.path
    ? result.path.map(node => `${node.nodeType}:${node.nodeId}${node.permission ? `.${node.permission}` : node.relation ? `.${node.relation}` : ''}`)
    : [...path, `${args.objectType}:${args.objectId}.${args.action}`];

  return {
    allowed: result.allowed,
    reason: result.reason,
    path: simplePath,
  };
}

/**
 * Enhanced recursive implementation with detailed path tracking
 *
 * Returns structured path information for graph visualization and debugging.
 */
async function canRecursiveWithPath(
  ctx: any,
  args: {
    objectType: string;
    objectId: string;
    action: string;
    subjectType: string;
    subjectId: string;
  },
  depth: number,
  path: TraversalNode[],
  triedPaths: TriedPath[]
): Promise<PathResult> {
  // Prevent infinite loops
  if (depth > MAX_DEPTH) {
    return {
      allowed: false,
      reason: "Max traversal depth exceeded",
      triedPaths: [{
        rulePart: "depth-check",
        failureReason: `Exceeded MAX_DEPTH=${MAX_DEPTH}`,
        partialPath: path
      }]
    };
  }

  // Only add current node for the initial target object (when path is empty)
  // For recursive calls, the node was already added as a relationNode by the parent
  const currentPath = path.length === 0
    ? [...path, {
        nodeType: args.objectType,
        nodeId: args.objectId,
        permission: args.action,
        depth
      }]
    : path;

  // 1. Look up permission rule
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
      relation: args.action,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
    });

    return {
      allowed: direct,
      reason: direct
        ? `Direct ${args.action} relation`
        : `No ${args.action} relation found`,
      matchedRule: direct ? args.action : undefined,
      path: direct ? [...currentPath, {
        nodeType: args.subjectType,
        nodeId: args.subjectId,
        relation: args.action,
        depth: depth + 1
      }] : undefined,
      triedPaths: direct ? undefined : [{
        rulePart: args.action,
        failureReason: "No matching tuple found",
        partialPath: currentPath
      }]
    };
  }

  // 3. Evaluate rules (OR logic)
  for (const part of rule.rules) {
    if (part.type === "direct") {
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
          matchedRule: part.relation!,
          path: [...currentPath, {
            nodeType: args.subjectType,
            nodeId: args.subjectId,
            relation: part.relation!,
            depth: depth + 1
          }]
        };
      } else {
        triedPaths.push({
          rulePart: part.relation!,
          failureReason: "No matching tuple found",
          partialPath: currentPath
        });
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

      if (related.length === 0) {
        triedPaths.push({
          rulePart: `${part.sourceRelation}->${part.targetPermission}`,
          failureReason: `No ${part.sourceRelation} relation found`,
          partialPath: currentPath
        });
        continue;
      }

      // Try each related object
      for (const rel of related) {
        const relationNode: TraversalNode = {
          nodeType: rel.subjectType,
          nodeId: rel.subjectId,
          relation: part.sourceRelation,
          depth: depth + 1
        };

        const result = await canRecursiveWithPath(
          ctx,
          {
            objectType: rel.subjectType,
            objectId: rel.subjectId,
            action: part.targetPermission!,
            subjectType: args.subjectType,
            subjectId: args.subjectId,
          },
          depth + 1,
          [...currentPath, relationNode],
          []
        );

        if (result.allowed) {
          return {
            allowed: true,
            reason: `${part.sourceRelation}->${part.targetPermission}`,
            matchedRule: `${part.sourceRelation}->${part.targetPermission}`,
            path: result.path
          };
        } else {
          triedPaths.push({
            rulePart: `${part.sourceRelation}->${part.targetPermission}`,
            failureReason: result.reason,
            partialPath: result.triedPaths?.[0]?.partialPath
          });
        }
      }
    }
  }

  return {
    allowed: false,
    reason: "No matching rule granted access",
    triedPaths
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
    // Fetch active permissions from catalog (dynamic, not hardcoded)
    const catalogPermissions = await ctx.db
      .query("permission_catalog")
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();
    const standardPermissions = catalogPermissions.map((p: any) => p.name);

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
