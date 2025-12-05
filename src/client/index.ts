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
  };
}

// Re-export types for convenience
export type { ComponentApi };
