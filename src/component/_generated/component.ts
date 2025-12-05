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
        { allowed: boolean; reason?: string; relation?: string },
        Name
      >;
      deletePermissions: FunctionReference<
        "mutation",
        "internal",
        { relation: string },
        boolean,
        Name
      >;
      getPermissions: FunctionReference<
        "query",
        "internal",
        { relation: string },
        { actions: Array<string>; relation: string } | null,
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
          create: boolean;
          delete: boolean;
          read: boolean;
          relation?: string;
          update: boolean;
        },
        Name
      >;
      initializeDefaults: FunctionReference<
        "mutation",
        "internal",
        {},
        null,
        Name
      >;
      listPermissions: FunctionReference<
        "query",
        "internal",
        {},
        Array<{ actions: Array<string>; relation: string }>,
        Name
      >;
      setPermissions: FunctionReference<
        "mutation",
        "internal",
        { actions: Array<string>; relation: string },
        string,
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
