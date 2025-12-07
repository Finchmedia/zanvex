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
    definePermission: (
      ctx: MutationCtx,
      objectType: string,
      permission: string,
      expression: string
    ) => {
      return ctx.runMutation(component.rules.definePermission as any, {
        objectType,
        permission,
        expression,
      });
    },

    /**
     * Get a specific permission rule
     */
    getPermissionRule: (
      ctx: QueryCtx,
      objectType: string,
      permission: string
    ) => {
      return ctx.runQuery(component.rules.getPermissionRule as any, {
        objectType,
        permission,
      });
    },

    /**
     * List all permission rules
     */
    listPermissionRules: (ctx: QueryCtx) => {
      return ctx.runQuery(component.rules.listPermissionRules as any, {});
    },

    /**
     * Delete a permission rule
     */
    deletePermissionRule: (
      ctx: MutationCtx,
      objectType: string,
      permission: string
    ) => {
      return ctx.runMutation(component.rules.deletePermissionRule as any, {
        objectType,
        permission,
      });
    },

    /**
     * Clear all permission rules
     */
    clearAllRules: (ctx: MutationCtx) => {
      return ctx.runMutation(component.rules.clearAllRules as any, {});
    },

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
      args: {
        name: string;
        description?: string;
        relations: Array<{
          name: string;
          targetType: string;
          description?: string;
        }>;
      }
    ) => {
      return ctx.runMutation(component.objectTypes.registerObjectType, args);
    },

    /**
     * Get a specific object type by name
     */
    getObjectType: (ctx: QueryCtx, name: string) => {
      return ctx.runQuery(component.objectTypes.getObjectType, { name });
    },

    /**
     * List all registered object types
     */
    listObjectTypes: (ctx: QueryCtx) => {
      return ctx.runQuery(component.objectTypes.listObjectTypes, {});
    },

    /**
     * Delete an object type
     */
    deleteObjectType: (ctx: MutationCtx, name: string) => {
      return ctx.runMutation(component.objectTypes.deleteObjectType, { name });
    },

    /**
     * Clear all object types
     */
    clearAllObjectTypes: (ctx: MutationCtx) => {
      return ctx.runMutation(component.objectTypes.clearAllObjectTypes, {});
    },

    /**
     * Get valid relations for an object type (for UI dropdowns)
     */
    getRelationsForType: (ctx: QueryCtx, objectType: string) => {
      return ctx.runQuery(component.objectTypes.getRelationsForType, { objectType });
    },

    /**
     * Get all permissions defined for an object type
     */
    getPermissionsForType: (ctx: QueryCtx, objectType: string) => {
      return ctx.runQuery(component.objectTypes.getPermissionsForType, { objectType });
    },

    // ============================================
    // PERMISSION CATALOG
    // ============================================

    /**
     * List all active permissions (for dropdowns)
     *
     * Returns permissions grouped by category (CRUD vs Actions).
     *
     * @example
     * const permissions = await zanvex.listPermissions(ctx);
     * // [
     * //   { name: "create", label: "Create", category: "crud" },
     * //   { name: "cancel", label: "Cancel", category: "action" }
     * // ]
     */
    listPermissions: (ctx: QueryCtx) => {
      return ctx.runQuery(component.permissionCatalog.listPermissions, {});
    },

    /**
     * Register a custom permission
     *
     * @example
     * await zanvex.registerPermission(ctx, {
     *   name: "review",
     *   label: "Review",
     *   description: "Review and provide feedback",
     *   category: "action"
     * });
     */
    registerPermission: (
      ctx: MutationCtx,
      args: {
        name: string;
        label: string;
        description?: string;
        category: "crud" | "action";
      }
    ) => {
      return ctx.runMutation(component.permissionCatalog.registerPermission, args);
    },

    /**
     * Deactivate a permission (soft delete)
     */
    deactivatePermission: (ctx: MutationCtx, name: string) => {
      return ctx.runMutation(component.permissionCatalog.deactivatePermission, { name });
    },

    // ============================================
    // RELATION CATALOG
    // ============================================

    /**
     * List all active relation names (for dropdowns)
     *
     * @example
     * const relationNames = await zanvex.listRelationNames(ctx);
     * // [
     * //   { name: "parent", label: "parent", description: "Parent/container relation" },
     * //   { name: "owner", label: "owner", description: "Ownership relation" }
     * // ]
     */
    listRelationNames: (ctx: QueryCtx) => {
      return ctx.runQuery(component.relationCatalog.listRelationNames, {});
    },

    /**
     * Register a custom relation name
     *
     * @example
     * await zanvex.registerRelationName(ctx, {
     *   name: "reviewer",
     *   label: "reviewer",
     *   description: "Who reviews this instance"
     * });
     */
    registerRelationName: (
      ctx: MutationCtx,
      args: {
        name: string;
        label: string;
        description?: string;
      }
    ) => {
      return ctx.runMutation(component.relationCatalog.registerRelationName, args);
    },

    /**
     * Deactivate a relation name (soft delete)
     */
    deactivateRelationName: (ctx: MutationCtx, name: string) => {
      return ctx.runMutation(component.relationCatalog.deactivateRelationName, { name });
    },

    // ============================================
    // THE MAGIC: ACTION-BASED PERMISSION CHECKS
    // ============================================

    /**
     * Check if a subject can perform an action on an object
     *
     * This is the main API for permission checks!
     * Now supports object-type-specific permissions.
     *
     * @example
     * // Can daniel delete this resource?
     * const result = await zanvex.can(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "delete",
     *   object: { type: "resource", id: "studio-a" },
     * });
     *
     * // Can daniel cancel this booking?
     * const result = await zanvex.can(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "cancel",
     *   object: { type: "booking", id: "booking-123" },
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
     * Check permissions with detailed traversal path tracking
     *
     * Returns comprehensive debugging information including:
     * - Exact path taken through the object graph
     * - Which rule granted access
     * - Detailed failure information for denied permissions
     *
     * Use this for debugging, audit logs, or UI permission tester/graph visualizations.
     *
     * @example
     * const result = await zanvex.canWithPath(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   action: "cancel",
     *   object: { type: "booking", id: "booking-123" },
     * });
     *
     * if (result.allowed) {
     *   console.log("Allowed via:", result.matchedRule);
     *   console.log("Path:", result.path);
     * } else {
     *   console.log("Denied. Tried paths:", result.triedPaths);
     * }
     */
    canWithPath: (
      ctx: QueryCtx,
      args: {
        subject: SubjectRef;
        action: string;
        object: ObjectRef;
      }
    ) => {
      return ctx.runQuery(component.permissions.canWithPath, {
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
     * Returns { create, read, update, delete, cancel, actions, relation }
     *
     * @example
     * const perms = await zanvex.getPermissionsForObject(ctx, {
     *   subject: { type: "user", id: "daniel" },
     *   object: { type: "booking", id: "booking-123" },
     * });
     * // { create: false, read: true, update: false, delete: false, cancel: true, actions: ["read", "cancel"], relation: "booker" }
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

/**
 * Traversal Path Tracking Types
 *
 * These types are used by canWithPath() to provide detailed information
 * about permission check paths for debugging and visualization.
 */

/** Represents a node in the permission check traversal path */
export interface TraversalNode {
  nodeType: string;      // "user", "org", "resource", "booking"
  nodeId: string;        // ID of the node
  relation?: string;     // Relation used to reach this node
  permission?: string;   // Permission checked at this node
  depth: number;         // Depth in traversal (0 = starting point)
}

/** Represents an attempted path that failed during permission check */
export interface TriedPath {
  rulePart: string;           // Which DSL rule part was tried
  failureReason: string;      // Why it failed
  partialPath?: TraversalNode[]; // How far we got before failing
}

/** Enhanced result with full traversal path information */
export interface PathResult {
  allowed: boolean;
  reason: string;               // Human-readable explanation
  matchedRule?: string;         // DSL expression that succeeded
  path?: TraversalNode[];       // Successful path (if allowed)
  triedPaths?: TriedPath[];     // Failed attempts (if denied)
}
