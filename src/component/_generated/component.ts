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
