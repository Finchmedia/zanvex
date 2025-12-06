import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { parsePermissionExpression } from "./dsl.js";

/**
 * Permission Rules CRUD
 *
 * Manage Zanzibar-style permission rules that define how permissions
 * are computed from relations.
 */

/**
 * Define (or update) a permission rule
 *
 * @param objectType - The object type (e.g., "booking", "resource")
 * @param permission - The permission name (e.g., "view", "edit", "cancel")
 * @param expression - DSL expression (e.g., "parent->edit | booker")
 *
 * @example
 * // Direct relation check
 * definePermission("booking", "cancel", "booker")
 *
 * // Computed permission
 * definePermission("resource", "edit", "owner->admin_of")
 *
 * // OR logic
 * definePermission("booking", "cancel", "parent->edit | booker")
 */
export const definePermission = mutation({
  args: {
    objectType: v.string(),
    permission: v.string(),
    expression: v.string(),
  },
  returns: v.id("permission_rules"),
  handler: async (ctx, { objectType, permission, expression }) => {
    // Parse and validate the expression
    const rules = parsePermissionExpression(expression);

    // Convert to storage format
    const rulesForStorage = rules.map((rule) => {
      if (rule.type === "direct") {
        return {
          type: "direct" as const,
          relation: rule.relation,
          sourceRelation: undefined,
          targetPermission: undefined,
        };
      } else {
        return {
          type: "computed" as const,
          relation: undefined,
          sourceRelation: rule.sourceRelation,
          targetPermission: rule.targetPermission,
        };
      }
    });

    // Upsert: Check if rule already exists
    const existing = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q) =>
        q.eq("objectType", objectType).eq("permission", permission)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        expression,
        rules: rulesForStorage,
      });
      return existing._id;
    }

    return await ctx.db.insert("permission_rules", {
      objectType,
      permission,
      expression,
      rules: rulesForStorage,
    });
  },
});

/**
 * Get a specific permission rule
 */
export const getPermissionRule = query({
  args: {
    objectType: v.string(),
    permission: v.string(),
  },
  returns: v.union(
    v.object({
      objectType: v.string(),
      permission: v.string(),
      expression: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { objectType, permission }) => {
    const rule = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q) =>
        q.eq("objectType", objectType).eq("permission", permission)
      )
      .first();

    if (!rule) return null;

    return {
      objectType: rule.objectType,
      permission: rule.permission,
      expression: rule.expression,
    };
  },
});

/**
 * List all permission rules
 */
export const listPermissionRules = query({
  args: {},
  returns: v.array(
    v.object({
      objectType: v.string(),
      permission: v.string(),
      expression: v.string(),
    })
  ),
  handler: async (ctx) => {
    const rules = await ctx.db.query("permission_rules").collect();

    return rules.map((r) => ({
      objectType: r.objectType,
      permission: r.permission,
      expression: r.expression,
    }));
  },
});

/**
 * Delete a permission rule
 */
export const deletePermissionRule = mutation({
  args: {
    objectType: v.string(),
    permission: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { objectType, permission }) => {
    const existing = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q) =>
        q.eq("objectType", objectType).eq("permission", permission)
      )
      .first();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});

/**
 * Clear all permission rules
 */
export const clearAllRules = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rules = await ctx.db.query("permission_rules").collect();

    for (const rule of rules) {
      await ctx.db.delete(rule._id);
    }

    return rules.length;
  },
});
