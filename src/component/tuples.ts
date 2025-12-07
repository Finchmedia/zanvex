import { v } from "convex/values";
import { mutation } from "./_generated/server.js";

/**
 * Tuple Write Operations
 *
 * These mutations manage relationship tuples in Zanzibar format.
 * Tuples are object-centric: (object, relation, subject)
 *
 * Examples:
 * - write("resource", "studio-a", "owner", "org", "acme")
 *   → Creates: resource:studio-a is owned by org:acme
 *
 * - write("org", "acme", "member_of", "user", "daniel")
 *   → Creates: org:acme has member user:daniel
 */

/**
 * Create a relationship tuple (idempotent)
 *
 * If the exact tuple already exists, returns the existing ID.
 * This makes it safe to call multiple times without creating duplicates.
 */
export const write = mutation({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    relation: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.id("tuples"),
  handler: async (ctx, args) => {
    // Check for existing tuple (idempotent write)
    const existing = await ctx.db
      .query("tuples")
      .withIndex("by_tuple", (q) =>
        q
          .eq("objectType", args.objectType)
          .eq("objectId", args.objectId)
          .eq("relation", args.relation)
          .eq("subjectType", args.subjectType)
          .eq("subjectId", args.subjectId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Insert new tuple
    return await ctx.db.insert("tuples", {
      objectType: args.objectType,
      objectId: args.objectId,
      relation: args.relation,
      subjectType: args.subjectType,
      subjectId: args.subjectId,
    });
  },
});

/**
 * Delete a relationship tuple
 *
 * Returns true if the tuple was deleted, false if it didn't exist.
 * This triggers automatic invalidation of any `check()` queries
 * that were reading this tuple - solving the "New Enemy Problem".
 */
export const remove = mutation({
  args: {
    objectType: v.string(),
    objectId: v.string(),
    relation: v.string(),
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tuples")
      .withIndex("by_tuple", (q) =>
        q
          .eq("objectType", args.objectType)
          .eq("objectId", args.objectId)
          .eq("relation", args.relation)
          .eq("subjectType", args.subjectType)
          .eq("subjectId", args.subjectId)
      )
      .first();

    if (!existing) {
      return false;
    }

    await ctx.db.delete(existing._id);
    return true;
  },
});

/**
 * Delete all tuples for an object
 *
 * Useful when deleting a resource - removes all associated permissions.
 * Returns the count of deleted tuples.
 */
export const removeAllForObject = mutation({
  args: {
    objectType: v.string(),
    objectId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const tuples = await ctx.db
      .query("tuples")
      .withIndex("by_object", (q) =>
        q.eq("objectType", args.objectType).eq("objectId", args.objectId)
      )
      .collect();

    for (const tuple of tuples) {
      await ctx.db.delete(tuple._id);
    }

    return tuples.length;
  },
});

/**
 * Delete all tuples for a subject
 *
 * Useful when deleting a user - removes all their permissions.
 * Returns the count of deleted tuples.
 */
export const removeAllForSubject = mutation({
  args: {
    subjectType: v.string(),
    subjectId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const tuples = await ctx.db
      .query("tuples")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", args.subjectType).eq("subjectId", args.subjectId)
      )
      .collect();

    for (const tuple of tuples) {
      await ctx.db.delete(tuple._id);
    }

    return tuples.length;
  },
});

/**
 * Delete ALL tuples in the database
 *
 * Use with caution - this removes all permissions!
 * Returns the count of deleted tuples.
 */
export const clearAll = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const tuples = await ctx.db.query("tuples").collect();

    for (const tuple of tuples) {
      await ctx.db.delete(tuple._id);
    }

    return tuples.length;
  },
});
