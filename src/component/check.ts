import { v } from "convex/values";
import { query } from "./_generated/server.js";

/**
 * Permission Check Queries
 *
 * These queries implement Zanzibar-style permission checks with
 * 1-hop graph traversal via `member_of` relations.
 *
 * The key insight: When any tuple is deleted, Convex automatically
 * invalidates all queries that read it. This solves the "New Enemy
 * Problem" without needing Zookies or Spanner timestamps.
 */

/**
 * Check if subject has relation to object
 *
 * Supports:
 * 1. Direct check: Does exact tuple exist?
 * 2. 1-hop traversal: Does subject belong to a group that has access?
 *
 * Example:
 *   check("resource", "studio-a", "owner", "user", "daniel")
 *
 *   Step 1: Direct check for (resource:studio-a, owner, user:daniel) → not found
 *   Step 2: Find daniel's memberships → [(org:acme, member_of, user:daniel)]
 *   Step 3: Check (resource:studio-a, owner, org:acme) → FOUND!
 *   Result: true (daniel can access via org membership)
 */
export const check = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    relation: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Step 1: Direct check - does the exact tuple exist?
    const direct = await ctx.db
      .query("relations")
      .withIndex("by_tuple", (q) =>
        q
          .eq("objectType", args.objectType)
          .eq("objectId", args.objectId)
          .eq("relation", args.relation)
          .eq("subjectType", args.subjectType)
          .eq("subjectId", args.subjectId)
      )
      .first();

    if (direct) {
      return true;
    }

    // Step 2: 1-hop traversal
    // Find all groups/orgs the subject is a member of
    // Looking for tuples like (org:acme, member_of, user:daniel)
    // Also includes admin_of, editor, viewer, etc. - any relation to a parent
    const allRelations = await ctx.db
      .query("relations")
      .withIndex("by_subject", (q) =>
        q
          .eq("subjectType", args.subjectType)
          .eq("subjectId", args.subjectId)
      )
      .collect();

    const memberships = allRelations.filter(
      (t) =>
        t.relation === "member_of" ||
        t.relation === "admin_of" ||
        t.relation === "editor" ||
        t.relation === "viewer"
    );

    // Step 3: Check if any membership grants access
    // For each org the user belongs to, check if THAT org has the relation
    for (const membership of memberships) {
      const indirect = await ctx.db
        .query("relations")
        .withIndex("by_tuple", (q) =>
          q
            .eq("objectType", args.objectType)
            .eq("objectId", args.objectId)
            .eq("relation", args.relation)
            .eq("subjectType", membership.objectType)
            .eq("subjectId", membership.objectId)
        )
        .first();

      if (indirect) {
        return true;
      }
    }

    return false;
  },
});

/**
 * List all subjects that have a specific relation to an object
 *
 * Example:
 *   listSubjects("resource", "studio-a", "owner")
 *   → [{ subjectType: "org", subjectId: "acme" }]
 *
 * Note: This returns direct relations only, not expanded memberships.
 * Use this for admin UIs showing "who has access to this resource".
 */
export const listSubjects = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    relation: v.string(),
  },
  returns: v.array(
    v.object({
      subjectType: v.string(),
      subjectId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const tuples = await ctx.db
      .query("relations")
      .withIndex("by_object", (q) =>
        q
          .eq("objectType", args.objectType)
          .eq("objectId", args.objectId)
          .eq("relation", args.relation)
      )
      .collect();

    return tuples.map((t) => ({
      subjectType: t.subjectType,
      subjectId: t.subjectId,
    }));
  },
});

/**
 * List all relations a subject has to any objects
 *
 * Example:
 *   listRelations("user", "daniel")
 *   → [
 *       { objectType: "org", objectId: "acme", relation: "member_of" },
 *       { objectType: "resource", objectId: "studio-a", relation: "viewer" }
 *     ]
 *
 * Use this for showing "what does this user have access to".
 */
export const listRelations = query({
  args: {
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.array(
    v.object({
      objectType: v.string(),
      objectId: v.string(),
      relation: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const tuples = await ctx.db
      .query("relations")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();

    return tuples.map((t) => ({
      objectType: t.objectType,
      objectId: t.objectId,
      relation: t.relation,
    }));
  },
});

/**
 * List all tuples for an object (all relations, all subjects)
 *
 * Example:
 *   listTuplesForObject("resource", "studio-a")
 *   → [
 *       { relation: "owner", subjectType: "org", subjectId: "acme" },
 *       { relation: "viewer", subjectType: "user", subjectId: "bob" }
 *     ]
 *
 * Use this for permission management UIs.
 */
export const listTuplesForObject = query({
  args: {
    objectType: v.string(),
    objectId: v.string(),
  },
  returns: v.array(
    v.object({
      relation: v.string(),
      subjectType: v.string(),
      subjectId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const tuples = await ctx.db
      .query("relations")
      .withIndex("by_object", (q) =>
        q.eq("objectType", args.objectType).eq("objectId", args.objectId)
      )
      .collect();

    return tuples.map((t) => ({
      relation: t.relation,
      subjectType: t.subjectType,
      subjectId: t.subjectId,
    }));
  },
});
