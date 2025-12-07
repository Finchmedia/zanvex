/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    check: {
      check: FunctionReference<
        "query",
        "internal",
        {
          objectId: string;
          objectType: string;
          relation: string;
          subjectId: string;
          subjectType: string;
        },
        boolean,
        Name
      >;
      checkWithPath: FunctionReference<
        "query",
        "internal",
        {
          objectId: string;
          objectType: string;
          relation: string;
          subjectId: string;
          subjectType: string;
        },
        {
          direct: boolean;
          granted: boolean;
          relation?: string;
          via?: { id: string; type: string };
        },
        Name
      >;
      listRelations: FunctionReference<
        "query",
        "internal",
        { subjectId: string; subjectType: string },
        Array<{ objectId: string; objectType: string; relation: string }>,
        Name
      >;
      listSubjects: FunctionReference<
        "query",
        "internal",
        { objectId: string; objectType: string; relation: string },
        Array<{ subjectId: string; subjectType: string }>,
        Name
      >;
      listTuplesForObject: FunctionReference<
        "query",
        "internal",
        { objectId: string; objectType: string },
        Array<{ relation: string; subjectId: string; subjectType: string }>,
        Name
      >;
    };
    objectTypes: {
      clearAllObjectTypes: FunctionReference<
        "mutation",
        "internal",
        {},
        number,
        Name
      >;
      deleteObjectType: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        boolean,
        Name
      >;
      getObjectType: FunctionReference<
        "query",
        "internal",
        { name: string },
        {
          description?: string;
          name: string;
          relations: Array<{
            description?: string;
            name: string;
            targetType: string;
          }>;
        } | null,
        Name
      >;
      getPermissionsForType: FunctionReference<
        "query",
        "internal",
        { objectType: string },
        Array<string>,
        Name
      >;
      getRelationsForType: FunctionReference<
        "query",
        "internal",
        { objectType: string },
        Array<{ description?: string; name: string; targetType: string }>,
        Name
      >;
      listObjectTypes: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          description?: string;
          name: string;
          relations: Array<{
            description?: string;
            name: string;
            targetType: string;
          }>;
        }>,
        Name
      >;
      registerObjectType: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          name: string;
          relations: Array<{
            description?: string;
            name: string;
            targetType: string;
          }>;
        },
        string,
        Name
      >;
    };
    permissionCatalog: {
      deactivatePermission: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        boolean,
        Name
      >;
      listPermissions: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          category: string;
          description?: string;
          label: string;
          name: string;
        }>,
        Name
      >;
      registerPermission: FunctionReference<
        "mutation",
        "internal",
        {
          category: "crud" | "action";
          description?: string;
          label: string;
          name: string;
        },
        string,
        Name
      >;
    };
    permissions: {
      can: FunctionReference<
        "query",
        "internal",
        {
          action: string;
          objectId: string;
          objectType: string;
          subjectId: string;
          subjectType: string;
        },
        { allowed: boolean; path?: Array<string>; reason?: string },
        Name
      >;
      canWithPath: FunctionReference<
        "query",
        "internal",
        {
          action: string;
          objectId: string;
          objectType: string;
          subjectId: string;
          subjectType: string;
        },
        {
          allowed: boolean;
          matchedRule?: string;
          path?: Array<{
            depth: number;
            nodeId: string;
            nodeType: string;
            permission?: string;
            relation?: string;
          }>;
          reason: string;
          triedPaths?: Array<{
            failureReason: string;
            partialPath?: Array<{
              depth: number;
              nodeId: string;
              nodeType: string;
              permission?: string;
              relation?: string;
            }>;
            rulePart: string;
          }>;
        },
        Name
      >;
      getPermissionsForObject: FunctionReference<
        "query",
        "internal",
        {
          objectId: string;
          objectType: string;
          subjectId: string;
          subjectType: string;
        },
        {
          actions: Array<string>;
          cancel: boolean;
          create: boolean;
          delete: boolean;
          edit: boolean;
          read: boolean;
          update: boolean;
          view: boolean;
        },
        Name
      >;
    };
    relationCatalog: {
      deactivateRelationName: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        boolean,
        Name
      >;
      listRelationNames: FunctionReference<
        "query",
        "internal",
        {},
        Array<{ description?: string; label: string; name: string }>,
        Name
      >;
      registerRelationName: FunctionReference<
        "mutation",
        "internal",
        { description?: string; label: string; name: string },
        string,
        Name
      >;
    };
    rules: {
      clearAllRules: FunctionReference<
        "mutation",
        "internal",
        {},
        number,
        Name
      >;
      definePermission: FunctionReference<
        "mutation",
        "internal",
        { expression: string; objectType: string; permission: string },
        string,
        Name
      >;
      deletePermissionRule: FunctionReference<
        "mutation",
        "internal",
        { objectType: string; permission: string },
        boolean,
        Name
      >;
      getPermissionRule: FunctionReference<
        "query",
        "internal",
        { objectType: string; permission: string },
        { expression: string; objectType: string; permission: string } | null,
        Name
      >;
      listPermissionRules: FunctionReference<
        "query",
        "internal",
        {},
        Array<{ expression: string; objectType: string; permission: string }>,
        Name
      >;
    };
    tuples: {
      clearAll: FunctionReference<"mutation", "internal", {}, number, Name>;
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          objectId: string;
          objectType: string;
          relation: string;
          subjectId: string;
          subjectType: string;
        },
        boolean,
        Name
      >;
      removeAllForObject: FunctionReference<
        "mutation",
        "internal",
        { objectId: string; objectType: string },
        number,
        Name
      >;
      removeAllForSubject: FunctionReference<
        "mutation",
        "internal",
        { subjectId: string; subjectType: string },
        number,
        Name
      >;
      write: FunctionReference<
        "mutation",
        "internal",
        {
          objectId: string;
          objectType: string;
          relation: string;
          subjectId: string;
          subjectType: string;
        },
        string,
        Name
      >;
    };
  };
