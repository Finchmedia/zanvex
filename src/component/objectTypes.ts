import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// Relation schema for reuse
const relationSchema = v.object({
  name: v.string(),
  targetType: v.string(),
  description: v.optional(v.string()),
});

// Object type schema for return values
const objectTypeSchema = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  relations: v.array(relationSchema),
});

/**
 * Register or update an object type with its relations
 */
export const registerObjectType = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    relations: v.array(relationSchema),
  },
  returns: v.id("object_types"),
  handler: async (ctx, { name, description, relations }) => {
    // Upsert: check if type already exists
    const existing = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { description, relations });
      return existing._id;
    }

    return await ctx.db.insert("object_types", { name, description, relations });
  },
});

/**
 * Get a specific object type
 */
export const getObjectType = query({
  args: { name: v.string() },
  returns: v.union(objectTypeSchema, v.null()),
  handler: async (ctx, { name }) => {
    const type = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!type) return null;

    return {
      name: type.name,
      description: type.description,
      relations: type.relations,
    };
  },
});

/**
 * List all object types
 */
export const listObjectTypes = query({
  args: {},
  returns: v.array(objectTypeSchema),
  handler: async (ctx) => {
    const types = await ctx.db.query("object_types").collect();

    return types.map((t) => ({
      name: t.name,
      description: t.description,
      relations: t.relations,
    }));
  },
});

/**
 * Delete an object type
 *
 * WARNING: Does not cascade delete rules or tuples
 */
export const deleteObjectType = mutation({
  args: { name: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { name }) => {
    const existing = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});

/**
 * Clear all object types
 */
export const clearAllObjectTypes = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const types = await ctx.db.query("object_types").collect();

    for (const type of types) {
      await ctx.db.delete(type._id);
    }

    return types.length;
  },
});

/**
 * Get valid relations for an object type
 * (Helper for UI dropdowns)
 */
export const getRelationsForType = query({
  args: { objectType: v.string() },
  returns: v.array(relationSchema),
  handler: async (ctx, { objectType }) => {
    const type = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", objectType))
      .first();

    return type?.relations ?? [];
  },
});

/**
 * Get all permissions defined for an object type
 * (Derived from permission_rules table)
 */
export const getPermissionsForType = query({
  args: { objectType: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, { objectType }) => {
    const rules = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q) => q.eq("objectType", objectType))
      .collect();

    return rules.map((r) => r.permission);
  },
});
