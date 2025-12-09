import type {
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

/**
 * Zanvex Client
 *
 * A type-safe wrapper for the Zanvex ReBAC component.
 * Use this in your app's Convex functions to manage permissions.
 *
 * Example:
 * ```typescript
 * import { createZanvexClient } from "@mrfinch/zanvex";
 * import { components } from "./_generated/api";
 *
 * const zanvex = createZanvexClient(components.zanvex);
 *
 * // In a mutation:
 * await zanvex.write(ctx, { type: "org", id: "acme" }, "member_of", { type: "user", id: "daniel" });
 *
 * // In a query:
 * const canAccess = await zanvex.check(ctx, { type: "resource", id: "studio-a" }, "owner", { type: "user", id: "daniel" });
 * ```
 */

/**
 * We use `any` here to allow the client to work with any app schema.
 * The component operates on generic tuple data and doesn't need to
 * know about the app's specific table schema.
 */
type QueryCtx = GenericQueryCtx<any>;
type MutationCtx = GenericMutationCtx<any>;

export interface ObjectRef {
  type: string;
  id: string;
}

export interface SubjectRef {
  type: string;
  id: string;
}

// Helper functions for common argument mappings
const mapObject = (o: ObjectRef) => ({ objectType: o.type, objectId: o.id });
const mapSubject = (s: SubjectRef) => ({ subjectType: s.type, subjectId: s.id });
const mapObjRelSub = (o: ObjectRef, relation: string, s: SubjectRef) => ({
  ...mapObject(o), relation, ...mapSubject(s)
});
const mapCanArgs = (args: { subject: SubjectRef; action: string; object: ObjectRef }) => ({
  ...mapObject(args.object), action: args.action, ...mapSubject(args.subject)
});
const mapPermsArgs = (args: { subject: SubjectRef; object: ObjectRef }) => ({
  ...mapObject(args.object), ...mapSubject(args.subject)
});

/**
 * Create a Zanvex client for use in app functions
 *
 * @param component - The zanvex component from `components.zanvex`
 * @returns An object with write, remove, check, listSubjects, and listRelations methods
 */
export function createZanvexClient(component: ComponentApi) {
  return {
    /**
     * Create a relationship tuple (idempotent)
     *
     * @example
     * // Grant org ownership of a resource
     * await zanvex.write(ctx, { type: "resource", id: "studio-a" }, "owner", { type: "org", id: "acme" });
     *
     * // Add user to org
     * await zanvex.write(ctx, { type: "org", id: "acme" }, "member_of", { type: "user", id: "daniel" });
     */
    write: (ctx: MutationCtx, object: ObjectRef, relation: string, subject: SubjectRef) =>
      ctx.runMutation(component.tuples.write, mapObjRelSub(object, relation, subject)),

    /**
     * Delete a relationship tuple
     *
     * @returns true if deleted, false if not found
     *
     * @example
     * // Remove user from org
     * await zanvex.remove(ctx, { type: "org", id: "acme" }, "member_of", { type: "user", id: "daniel" });
     */
    remove: (ctx: MutationCtx, object: ObjectRef, relation: string, subject: SubjectRef) =>
      ctx.runMutation(component.tuples.remove, mapObjRelSub(object, relation, subject)),

    /**
     * Delete all tuples for an object
     *
     * @returns count of deleted tuples
     *
     * @example
     * // When deleting a resource, remove all permissions
     * await zanvex.removeAllForObject(ctx, { type: "resource", id: "studio-a" });
     */
    removeAllForObject: (ctx: MutationCtx, object: ObjectRef) =>
      ctx.runMutation(component.tuples.removeAllForObject, mapObject(object)),

    /**
     * Delete all tuples for a subject
     *
     * @returns count of deleted tuples
     *
     * @example
     * // When deleting a user, remove all their permissions
     * await zanvex.removeAllForSubject(ctx, { type: "user", id: "daniel" });
     */
    removeAllForSubject: (ctx: MutationCtx, subject: SubjectRef) =>
      ctx.runMutation(component.tuples.removeAllForSubject, mapSubject(subject)),

    /**
     * Check if subject has relation to object (with 1-hop traversal)
     *
     * Traversal follows `member_of` relations automatically.
     *
     * @example
     * // Direct check: user:daniel owns resource:studio-a?
     * const canAccess = await zanvex.check(ctx, { type: "resource", id: "studio-a" }, "owner", { type: "user", id: "daniel" });
     *
     * // With traversal: user:daniel is member of org:acme, which owns resource:studio-a
     * // → Returns true because of the indirect path
     */
    check: (ctx: QueryCtx, object: ObjectRef, relation: string, subject: SubjectRef) =>
      ctx.runQuery(component.check.check, mapObjRelSub(object, relation, subject)),

    /**
     * List all subjects with a specific relation to an object
     *
     * @example
     * // Who owns this resource?
     * const owners = await zanvex.listSubjects(ctx, { type: "resource", id: "studio-a" }, "owner");
     * // → [{ type: "org", id: "acme" }]
     */
    listSubjects: (ctx: QueryCtx, object: ObjectRef, relation: string) =>
      ctx.runQuery(component.check.listSubjects, { ...mapObject(object), relation }),

    /**
     * List all relations a subject has
     *
     * @example
     * // What does this user have access to?
     * const relations = await zanvex.listRelations(ctx, { type: "user", id: "daniel" });
     * // → [{ objectType: "org", objectId: "acme", relation: "member_of" }]
     */
    listRelations: (ctx: QueryCtx, subject: SubjectRef) =>
      ctx.runQuery(component.check.listRelations, mapSubject(subject)),

    /**
     * List all tuples for an object (all relations, all subjects)
     *
     * @example
     * // Show all permissions for this resource
     * const tuples = await zanvex.listTuplesForObject(ctx, { type: "resource", id: "studio-a" });
     * // → [{ relation: "owner", subjectType: "org", subjectId: "acme" }]
     */
    listTuplesForObject: (ctx: QueryCtx, object: ObjectRef) =>
      ctx.runQuery(component.check.listTuplesForObject, mapObject(object)),

    /**
     * Delete ALL tuples in the database
     *
     * Use with caution - this removes all permissions!
     *
     * @returns count of deleted tuples
     *
     * @example
     * // Clear all permissions (for testing/reset)
     * const deleted = await zanvex.clearAll(ctx);
     */
    clearAll: (ctx: MutationCtx) => ctx.runMutation(component.tuples.clearAll, {}),

    // ============================================
    // PERMISSION RULES (Zanzibar-style DSL)
    // ============================================

    /**
     * Define a permission rule using DSL syntax
     *
     * DSL Syntax:
     *   - "booker"              → Direct relation check
     *   - "owner->admin_of"     → Follow 'owner' relation, check 'admin_of' on target
     *   - "parent->edit | booker" → OR logic (either path grants access)
     *
     * @param objectType - The object type (e.g., "booking", "resource")
     * @param permission - The permission name (e.g., "view", "edit", "cancel")
     * @param expression - DSL expression (e.g., "parent->edit | booker")
     *
     * @example
     * // Direct relation check (booker can cancel their own booking)
     * await zanvex.definePermission(ctx, "booking", "cancel", "booker");
     *
     * // Computed permission (resource owner's admins can edit)
     * await zanvex.definePermission(ctx, "resource", "edit", "owner->admin_of");
     *
     * // OR logic (admin through hierarchy OR direct booker relation)
     * await zanvex.definePermission(ctx, "booking", "cancel", "parent->edit | booker");
     */
    definePermission: (ctx: MutationCtx, objectType: string, permission: string, expression: string) =>
      ctx.runMutation(component.rules.definePermission as any, { objectType, permission, expression }),

    /** Get a specific permission rule */
    getPermissionRule: (ctx: QueryCtx, objectType: string, permission: string) =>
      ctx.runQuery(component.rules.getPermissionRule as any, { objectType, permission }),

    /** List all permission rules */
    listPermissionRules: (ctx: QueryCtx) =>
      ctx.runQuery(component.rules.listPermissionRules as any, {}),

    /** Delete a permission rule */
    deletePermissionRule: (ctx: MutationCtx, objectType: string, permission: string) =>
      ctx.runMutation(component.rules.deletePermissionRule as any, { objectType, permission }),

    /** Clear all permission rules */
    clearAllRules: (ctx: MutationCtx) =>
      ctx.runMutation(component.rules.clearAllRules as any, {}),

    // ============================================
    // OBJECT TYPES SCHEMA REGISTRY
    // ============================================

    /**
     * Register or update an object type with its relations
     *
     * @example
     * await zanvex.registerObjectType(ctx, {
     *   name: "resource",
     *   description: "A bookable resource like a studio or room",
     *   relations: [
     *     { name: "owner", targetType: "org", description: "The org that owns this resource" }
     *   ]
     * });
     */
    registerObjectType: (
      ctx: MutationCtx,
      args: { name: string; description?: string; relations: Array<{ name: string; targetType: string; description?: string }> }
    ) => ctx.runMutation(component.objectTypes.registerObjectType, args),

    /** Get a specific object type by name */
    getObjectType: (ctx: QueryCtx, name: string) =>
      ctx.runQuery(component.objectTypes.getObjectType, { name }),

    /** List all registered object types */
    listObjectTypes: (ctx: QueryCtx) =>
      ctx.runQuery(component.objectTypes.listObjectTypes, {}),

    /** Delete an object type */
    deleteObjectType: (ctx: MutationCtx, name: string) =>
      ctx.runMutation(component.objectTypes.deleteObjectType, { name }),

    /** Clear all object types */
    clearAllObjectTypes: (ctx: MutationCtx) =>
      ctx.runMutation(component.objectTypes.clearAllObjectTypes, {}),

    /** Get valid relations for an object type (for UI dropdowns) */
    getRelationsForType: (ctx: QueryCtx, objectType: string) =>
      ctx.runQuery(component.objectTypes.getRelationsForType, { objectType }),

    /** Get all permissions defined for an object type */
    getPermissionsForType: (ctx: QueryCtx, objectType: string) =>
      ctx.runQuery(component.objectTypes.getPermissionsForType, { objectType }),

    // ============================================
    // PERMISSION CATALOG
    // ============================================

    /**
     * List all active permissions (for dropdowns)
     *
     * @example
     * const permissions = await zanvex.listPermissions(ctx);
     * // [{ name: "create", label: "Create", category: "crud" }, ...]
     */
    listPermissions: (ctx: QueryCtx) =>
      ctx.runQuery(component.permissionCatalog.listPermissions, {}),

    /**
     * Register a custom permission
     *
     * @example
     * await zanvex.registerPermission(ctx, {
     *   name: "review", label: "Review", description: "Review and provide feedback", category: "action"
     * });
     */
    registerPermission: (
      ctx: MutationCtx,
      args: { name: string; label: string; description?: string; category: "crud" | "action" }
    ) => ctx.runMutation(component.permissionCatalog.registerPermission, args),

    /** Deactivate a permission (soft delete) */
    deactivatePermission: (ctx: MutationCtx, name: string) =>
      ctx.runMutation(component.permissionCatalog.deactivatePermission, { name }),

    // ============================================
    // RELATION CATALOG
    // ============================================

    /**
     * List all active relation names (for dropdowns)
     *
     * @example
     * const relationNames = await zanvex.listRelationNames(ctx);
     * // [{ name: "parent", label: "parent", description: "Parent/container relation" }, ...]
     */
    listRelationNames: (ctx: QueryCtx) =>
      ctx.runQuery(component.relationCatalog.listRelationNames, {}),

    /**
     * Register a custom relation name
     *
     * @example
     * await zanvex.registerRelationName(ctx, { name: "reviewer", label: "reviewer", description: "Who reviews" });
     */
    registerRelationName: (
      ctx: MutationCtx,
      args: { name: string; label: string; description?: string }
    ) => ctx.runMutation(component.relationCatalog.registerRelationName, args),

    /** Deactivate a relation name (soft delete) */
    deactivateRelationName: (ctx: MutationCtx, name: string) =>
      ctx.runMutation(component.relationCatalog.deactivateRelationName, { name }),

    // ============================================
    // THE MAGIC: ACTION-BASED PERMISSION CHECKS
    // ============================================

    /**
     * Check if a subject can perform an action on an object
     *
     * This is the main API for permission checks!
     *
     * @example
     * const result = await zanvex.can(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "cancel",
     *   object: { type: "booking", id: "booking-123" },
     * });
     * if (!result.allowed) throw new Error(`Forbidden: ${result.reason}`);
     */
    can: (ctx: QueryCtx, args: { subject: SubjectRef; action: string; object: ObjectRef }) =>
      ctx.runQuery(component.permissions.can, mapCanArgs(args)),

    /**
     * Check permissions with detailed traversal path tracking
     *
     * Use this for debugging, audit logs, or UI permission tester/graph visualizations.
     *
     * @example
     * const result = await zanvex.canWithPath(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "cancel",
     *   object: { type: "booking", id: "booking-123" },
     * });
     * if (result.allowed) console.log("Allowed via:", result.matchedRule, result.path);
     */
    canWithPath: (ctx: QueryCtx, args: { subject: SubjectRef; action: string; object: ObjectRef }) =>
      ctx.runQuery(component.permissions.canWithPath, mapCanArgs(args)),

    /**
     * Get all permissions a subject has on an object
     *
     * @example
     * const perms = await zanvex.getPermissionsForObject(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   object: { type: "booking", id: "booking-123" },
     * });
     * // { create: false, read: true, cancel: true, actions: ["read", "cancel"] }
     */
    getPermissionsForObject: (ctx: QueryCtx, args: { subject: SubjectRef; object: ObjectRef }) =>
      ctx.runQuery(component.permissions.getPermissionsForObject, mapPermsArgs(args)),
  };
}

// Re-export types for convenience
export type { ComponentApi };

// Re-export traversal path types from component (single source of truth)
export type { TraversalNode, TriedPath, PathResult } from "../component/permissions.js";
