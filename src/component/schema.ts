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
   * Permission Schema
   *
   * Defines what actions each relation grants.
   * This is the "policy" that determines what admin_of vs member_of can do.
   *
   * Example:
   *   { relation: "admin_of", actions: ["create", "read", "update", "delete"] }
   *   { relation: "member_of", actions: ["read"] }
   *
   * When checking `can(user, "delete", resource)`:
   *   1. Find path: user → admin_of → org → owner → resource
   *   2. Look up "admin_of" in this table
   *   3. Check if "delete" is in actions array
   *   4. Return true/false
   */
  permission_schema: defineTable({
    relation: v.string(), // "admin_of", "member_of", "editor", "viewer"
    actions: v.array(v.string()), // ["create", "read", "update", "delete"]
  }).index("by_relation", ["relation"]),
});
