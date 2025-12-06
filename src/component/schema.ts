import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Zanvex ReBAC Schema
 *
 * Stores relationship tuples in Zanzibar format:
 * (object, relation, subject)
 *
 * Example tuples:
 * - (resource:studio-a, owner, org:acme)     → "studio-a is owned by acme"
 * - (org:acme, member_of, user:daniel)       → "acme has member daniel"
 */
export default defineSchema({
  relations: defineTable({
    // The object being accessed (e.g., "resource", "org")
    objectType: v.string(),
    objectId: v.string(),

    // The relationship type (e.g., "owner", "member_of", "viewer")
    relation: v.string(),

    // The subject with access (can be user or another object like org)
    subjectType: v.string(),
    subjectId: v.string(),
  })
    // For "who has access to this object?"
    // Query: All subjects with relation X to object Y
    .index("by_object", ["objectType", "objectId", "relation"])

    // For "what does this subject have access to?"
    // Query: All objects where subject has relation X
    .index("by_subject", ["subjectType", "subjectId", "relation"])

    // For exact tuple lookup (deduplication, idempotent writes)
    // Query: Does this exact tuple exist?
    .index("by_tuple", [
      "objectType",
      "objectId",
      "relation",
      "subjectType",
      "subjectId",
    ]),

  /**
   * Permission Schema (Legacy)
   *
   * Defines what actions each relation grants, optionally per object type.
   * This is the "policy" that determines what admin_of vs member_of can do.
   *
   * Example:
   *   { relation: "admin_of", objectType: "*", actions: ["create", "read", "update", "delete"] }
   *   { relation: "member_of", objectType: "resource", actions: ["read"] }
   *   { relation: "member_of", objectType: "booking", actions: ["read", "cancel"] }
   *   { relation: "booker", objectType: "booking", actions: ["read", "cancel"] }
   *
   * When checking `can(user, "delete", resource)`:
   *   1. Find path: user → admin_of → org → owner → resource
   *   2. Look up (admin_of, resource) or (admin_of, *) in this table
   *   3. Check if "delete" is in actions array
   *   4. Return true/false
   *
   * objectType: "*" means "applies to all object types" (default/fallback)
   */
  permission_schema: defineTable({
    relation: v.string(), // "admin_of", "member_of", "editor", "viewer", "booker"
    objectType: v.string(), // "resource", "booking", "*" (wildcard for all)
    actions: v.array(v.string()), // ["create", "read", "update", "delete", "cancel"]
  })
    .index("by_relation", ["relation"])
    .index("by_relation_objectType", ["relation", "objectType"]),

  /**
   * Permission Rules (Zanzibar-style)
   *
   * Defines how permissions are computed from relations using a DSL.
   * This enables recursive traversal through the object graph.
   *
   * DSL Syntax:
   *   - "booker"           → Direct relation check
   *   - "owner->admin_of"  → Follow 'owner' relation, check 'admin_of' permission on target
   *   - "parent->edit | booker" → OR logic: either path grants access
   *
   * Example rules:
   *   { objectType: "resource", permission: "view", expression: "owner->admin_of | owner->member_of" }
   *   { objectType: "resource", permission: "edit", expression: "owner->admin_of" }
   *   { objectType: "booking", permission: "view", expression: "parent->view | booker" }
   *   { objectType: "booking", permission: "cancel", expression: "parent->edit | booker" }
   *
   * When checking `can(user:daniel, cancel, booking:123)`:
   *   1. Look up rule: booking.cancel = "parent->edit | booker"
   *   2. Evaluate "booker": Is there tuple (booking:123, booker, user:daniel)? → If yes, ALLOW
   *   3. Evaluate "parent->edit":
   *      - Find booking's parent → resource:studio-a
   *      - Recursively: can(daniel, edit, resource:studio-a)
   *        - Rule: resource.edit = "owner->admin_of"
   *        - Find owner → org:acme
   *        - Recursively: can(daniel, admin_of, org:acme)
   *          - No rule → direct check → tuple exists? → YES!
   *      - Returns true
   *   4. Return ALLOW
   *
   * Key insight: If no rule exists for a permission, it's a direct relation check.
   */
  permission_rules: defineTable({
    objectType: v.string(), // "booking", "resource", "org"
    permission: v.string(), // "view", "edit", "cancel", "delete"
    expression: v.string(), // "parent->edit | booker" (human readable DSL)
    rules: v.array(
      v.object({
        // Parsed rules for evaluation
        type: v.union(v.literal("direct"), v.literal("computed")),
        relation: v.optional(v.string()), // For direct: "booker"
        sourceRelation: v.optional(v.string()), // For computed: "parent"
        targetPermission: v.optional(v.string()), // For computed: "edit"
      })
    ),
  }).index("by_type_permission", ["objectType", "permission"]),
});
