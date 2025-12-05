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
    write: (
      ctx: MutationCtx,
      object: ObjectRef,
      relation: string,
      subject: SubjectRef
    ) => {
      return ctx.runMutation(component.tuples.write, {
        objectType: object.type,
        objectId: object.id,
        relation,
        subjectType: subject.type,
        subjectId: subject.id,
      });
    },

    /**
     * Delete a relationship tuple
     *
     * @returns true if deleted, false if not found
     *
     * @example
     * // Remove user from org
     * await zanvex.remove(ctx, { type: "org", id: "acme" }, "member_of", { type: "user", id: "daniel" });
     */
    remove: (
      ctx: MutationCtx,
      object: ObjectRef,
      relation: string,
      subject: SubjectRef
    ) => {
      return ctx.runMutation(component.tuples.remove, {
        objectType: object.type,
        objectId: object.id,
        relation,
        subjectType: subject.type,
        subjectId: subject.id,
      });
    },

    /**
     * Delete all tuples for an object
     *
     * @returns count of deleted tuples
     *
     * @example
     * // When deleting a resource, remove all permissions
     * await zanvex.removeAllForObject(ctx, { type: "resource", id: "studio-a" });
     */
    removeAllForObject: (ctx: MutationCtx, object: ObjectRef) => {
      return ctx.runMutation(component.tuples.removeAllForObject, {
        objectType: object.type,
        objectId: object.id,
      });
    },

    /**
     * Delete all tuples for a subject
     *
     * @returns count of deleted tuples
     *
     * @example
     * // When deleting a user, remove all their permissions
     * await zanvex.removeAllForSubject(ctx, { type: "user", id: "daniel" });
     */
    removeAllForSubject: (ctx: MutationCtx, subject: SubjectRef) => {
      return ctx.runMutation(component.tuples.removeAllForSubject, {
        subjectType: subject.type,
        subjectId: subject.id,
      });
    },

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
    check: (
      ctx: QueryCtx,
      object: ObjectRef,
      relation: string,
      subject: SubjectRef
    ) => {
      return ctx.runQuery(component.check.check, {
        objectType: object.type,
        objectId: object.id,
        relation,
        subjectType: subject.type,
        subjectId: subject.id,
      });
    },

    /**
     * List all subjects with a specific relation to an object
     *
     * @example
     * // Who owns this resource?
     * const owners = await zanvex.listSubjects(ctx, { type: "resource", id: "studio-a" }, "owner");
     * // → [{ type: "org", id: "acme" }]
     */
    listSubjects: (ctx: QueryCtx, object: ObjectRef, relation: string) => {
      return ctx.runQuery(component.check.listSubjects, {
        objectType: object.type,
        objectId: object.id,
        relation,
      });
    },

    /**
     * List all relations a subject has
     *
     * @example
     * // What does this user have access to?
     * const relations = await zanvex.listRelations(ctx, { type: "user", id: "daniel" });
     * // → [{ objectType: "org", objectId: "acme", relation: "member_of" }]
     */
    listRelations: (ctx: QueryCtx, subject: SubjectRef) => {
      return ctx.runQuery(component.check.listRelations, {
        subjectType: subject.type,
        subjectId: subject.id,
      });
    },

    /**
     * List all tuples for an object (all relations, all subjects)
     *
     * @example
     * // Show all permissions for this resource
     * const tuples = await zanvex.listTuplesForObject(ctx, { type: "resource", id: "studio-a" });
     * // → [{ relation: "owner", subjectType: "org", subjectId: "acme" }]
     */
    listTuplesForObject: (ctx: QueryCtx, object: ObjectRef) => {
      return ctx.runQuery(component.check.listTuplesForObject, {
        objectType: object.type,
        objectId: object.id,
      });
    },

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
    clearAll: (ctx: MutationCtx) => {
      return ctx.runMutation(component.tuples.clearAll, {});
    },

    // ============================================
    // PERMISSION SCHEMA MANAGEMENT
    // ============================================

    /**
     * Set what actions a relation grants
     *
     * @example
     * // Admins can do everything
     * await zanvex.setPermissions(ctx, "admin_of", ["create", "read", "update", "delete"]);
     *
     * // Members can only read
     * await zanvex.setPermissions(ctx, "member_of", ["read"]);
     */
    setPermissions: (ctx: MutationCtx, relation: string, actions: string[]) => {
      return ctx.runMutation(component.permissions.setPermissions, {
        relation,
        actions,
      });
    },

    /**
     * Get permissions for a relation
     */
    getPermissions: (ctx: QueryCtx, relation: string) => {
      return ctx.runQuery(component.permissions.getPermissions, { relation });
    },

    /**
     * List all permission schemas
     */
    listPermissions: (ctx: QueryCtx) => {
      return ctx.runQuery(component.permissions.listPermissions, {});
    },

    /**
     * Delete a permission schema
     */
    deletePermissions: (ctx: MutationCtx, relation: string) => {
      return ctx.runMutation(component.permissions.deletePermissions, {
        relation,
      });
    },

    /**
     * Initialize default permissions (admin_of, member_of)
     *
     * Call once to set up sensible defaults
     */
    initializeDefaults: (ctx: MutationCtx) => {
      return ctx.runMutation(component.permissions.initializeDefaults, {});
    },

    // ============================================
    // THE MAGIC: ACTION-BASED PERMISSION CHECKS
    // ============================================

    /**
     * Check if a subject can perform an action on an object
     *
     * This is the main API for permission checks!
     *
     * @example
     * // Can daniel delete this resource?
     * const result = await zanvex.can(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "delete",
     *   object: { type: "resource", id: "studio-a" },
     * });
     *
     * if (!result.allowed) {
     *   throw new Error(`Forbidden: ${result.reason}`);
     * }
     */
    can: (
      ctx: QueryCtx,
      args: {
        subject: SubjectRef;
        action: string;
        object: ObjectRef;
      }
    ) => {
      return ctx.runQuery(component.permissions.can, {
        objectType: args.object.type,
        objectId: args.object.id,
        action: args.action,
        subjectType: args.subject.type,
        subjectId: args.subject.id,
      });
    },

    /**
     * Get all permissions a subject has on an object
     *
     * Returns { create, read, update, delete } booleans
     *
     * @example
     * const perms = await zanvex.getPermissionsForObject(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   object: { type: "resource", id: "studio-a" },
     * });
     * // { create: true, read: true, update: true, delete: true, relation: "admin_of" }
     */
    getPermissionsForObject: (
      ctx: QueryCtx,
      args: {
        subject: SubjectRef;
        object: ObjectRef;
      }
    ) => {
      return ctx.runQuery(component.permissions.getPermissionsForObject, {
        objectType: args.object.type,
        objectId: args.object.id,
        subjectType: args.subject.type,
        subjectId: args.subject.id,
      });
    },
  };
}

// Re-export types for convenience
export type { ComponentApi };
