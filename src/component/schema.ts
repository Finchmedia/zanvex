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
  /**
   * Object Types Schema Registry
   *
   * Stores the schema definition for object types and their valid relations.
   * This enables schema-driven permission traversal and UI validation.
   *
   * Example:
   *   { name: "resource", relations: [{ name: "owner", targetType: "org" }] }
   *   { name: "booking", relations: [{ name: "parent", targetType: "resource" }, { name: "booker", targetType: "user" }] }
   */
  object_types: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    relations: v.array(
      v.object({
        name: v.string(),
        targetType: v.string(),
        description: v.optional(v.string()),
      })
    ),
  }).index("by_name", ["name"]),

  /**
   * Permission Catalog
   *
   * Registry of available permissions (CRUD + common actions).
   * Users can add custom permissions specific to their domain.
   *
   * Example:
   *   { name: "create", label: "Create", description: "Create new instances", category: "crud", isActive: true }
   *   { name: "cancel", label: "Cancel", description: "Cancel/revoke an action", category: "action", isActive: true }
   */
  permission_catalog: defineTable({
    name: v.string(),              // "create", "read", "update", "delete", "cancel", etc.
    label: v.string(),             // "Create", "Read", "Update", "Delete", "Cancel"
    description: v.optional(v.string()), // "Create new instances"
    category: v.string(),          // "crud" or "action"
    isActive: v.boolean(),         // Allow soft-delete without breaking existing rules
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  /**
   * Relation Name Catalog
   *
   * Registry of common relation names for ReBAC patterns.
   * Provides suggestions for object type relations and ensures consistency.
   *
   * Example:
   *   { name: "parent", label: "parent", description: "Parent/container relation", isActive: true }
   *   { name: "owner", label: "owner", description: "Ownership relation", isActive: true }
   */
  relation_catalog: defineTable({
    name: v.string(),              // "parent", "owner", "admin_of", etc.
    label: v.string(),             // "parent", "owner", "admin_of"
    description: v.optional(v.string()), // "Parent/container relation"
    isActive: v.boolean(),
  }).index("by_name", ["name"]),

  /**
   * Relationship Tuples
   *
   * Stores relationship tuples in Zanzibar format: (object, relation, subject)
   *
   * Example tuples:
   *   - (resource:studio-a, owner, org:acme)     → "studio-a is owned by acme"
   *   - (org:acme, member_of, user:daniel)       → "acme has member daniel"
   *   - (booking:123, booker, user:mike)         → "booking 123 was made by mike"
   */
  tuples: defineTable({
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
