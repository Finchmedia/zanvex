# Zanvex Code Review

**Date:** December 9, 2025
**Scope:** Code redundancy, bloat, and optimization opportunities
**Exclusions:** Overall tuple/Zanzibar architecture decisions

---

## Executive Summary

The codebase is **well-intentioned but significantly over-engineered and repetitive**. Main issues:

1. **Hand-written method wrappers** instead of generative patterns (~550 lines could be ~150)
2. **Duplicated recursive logic** in permission checking (~150 lines duplication)
3. **Lack of utility functions** for common patterns (upsert, query+map, entity resolution)
4. **Parallel implementations** in example app (app.ts vs example.ts)
5. **Test setup duplication** across 3 files

**Estimated reduction potential:** 30-40% of codebase without losing functionality.

---

## Table of Contents

1. [Component Backend (`src/component/`)](#1-component-backend)
2. [Client SDK (`src/client/`)](#2-client-sdk)
3. [React Module (`src/react/`)](#3-react-module)
4. [Example App (`example/`)](#4-example-app)
5. [Tests and Configuration](#5-tests-and-configuration)
6. [Priority Recommendations](#6-priority-recommendations)

---

## 1. Component Backend

### 1.1 CRITICAL: Duplicate Recursive Permission Functions

**Files:** `src/component/permissions.ts` (lines 154-268 vs 276-448)

**Issue:** `canRecursive` and `canRecursiveWithPath` are ~95% identical (~150 lines duplication). Both implement the same algorithm:
1. Check depth limit
2. Look up permission rule
3. Iterate through rule parts
4. Check direct tuple or recurse on related objects

**Difference:** Only path tracking varies (strings vs structured TraversalNode objects).

**Direction:** Unify into single function with optional `withPath` parameter.

---

### 1.2 HIGH: Duplicate Catalog Patterns (4 files)

**Files:**
- `permissionCatalog.ts` (lines 35-47, 75-100, 117-130, 175-187)
- `relationCatalog.ts` (lines 35-45, 71-94, 111-124, 191-203)

**Duplicated patterns:**
| Pattern | Lines Each | Total Duplication |
|---------|-----------|-------------------|
| Active filter query | ~12 | ~24 |
| Upsert (query→patch/insert) | ~25 | ~50 |
| Deactivation | ~13 | ~26 |
| Initialization loop | ~12 | ~24 |

**Direction:** Extract helpers:
- `listActiveFromTable(ctx, tableName)`
- `upsertInTable(ctx, tableName, nameValue, fields)`
- `deactivateFromTable(ctx, tableName, name)`
- `initializeTable(ctx, tableName, items)`

---

### 1.3 MEDIUM: Duplicate Tuple Operations

**File:** `src/component/tuples.ts`

| Pattern | Locations | Lines |
|---------|-----------|-------|
| Tuple lookup by index | lines 35-45, 79-89 | ~20 |
| Delete loop + return count | lines 120-122, 148-150, 168-170 | ~9 |
| Argument schema definition | lines 24-30, 70-76 | ~12 |

**Direction:** Extract `findTuple(ctx, args)` and `deleteTuplesAndReturnCount(ctx, tuples)`.

---

### 1.4 MEDIUM: Hardcoded Traversal Relations

**File:** `src/component/check.ts` (lines 129-135)

```typescript
const memberships = allRelations.filter(
  (t: any) =>
    t.relation === "member_of" ||
    t.relation === "admin_of" ||
    t.relation === "editor" ||
    t.relation === "viewer"
);
```

**Issue:** Not extensible. Custom relations added via `registerRelationName` won't be traversed.

**Direction:** Query `relation_catalog` with `isTraversable` flag instead of hardcoding.

---

### 1.5 MEDIUM: Hardcoded Permission Names in Return Type

**File:** `src/component/permissions.ts` (lines 556-563)

```typescript
return {
  create: results["create"] ?? false,
  read: results["read"] ?? false,
  update: results["update"] ?? false,
  delete: results["delete"] ?? false,
  view: results["view"] ?? false,
  edit: results["edit"] ?? false,
  cancel: results["cancel"] ?? false,
  actions: allowedActions,
};
```

**Issue:** Locks in 7 specific permissions despite dynamic `permission_catalog`.

**Direction:** Return dynamic object or document why these 7 are essential.

---

### 1.6 MEDIUM: Type/Schema Duplication

**File:** `src/component/permissions.ts` (lines 30-53 vs 127-144)

Three interfaces (`TraversalNode`, `TriedPath`, `PathResult`) defined as:
1. TypeScript interfaces (lines 31-53)
2. Convex value schemas (lines 127-144)

**Direction:** Single source of truth - derive one from the other.

---

### 1.7 LOW: Object Type Lookup Duplication

**File:** `src/component/objectTypes.ts` (lines 30-33, 51-54, 92-94)

Same query pattern appears 3 times:
```typescript
const existing = await ctx.db
  .query("object_types")
  .withIndex("by_name", (q) => q.eq("name", name))
  .first();
```

**Direction:** Extract `findObjectTypeByName(ctx, name)`.

---

## 2. Client SDK

### 2.1 CRITICAL: Massive Method Wrapper Duplication

**File:** `src/client/index.ts` (lines 54-587)

**Issue:** 25+ methods follow identical pattern:
```typescript
methodName: (ctx, object, relation, subject) => {
  return ctx.runMutation(component.xxx.yyy, {
    objectType: object.type,
    objectId: object.id,
    // ... trivial field renaming
  });
},
```

**Scale:** ~550 lines of repetitive wrappers.

**Direction:** Generate methods from configuration object. Could reduce to ~100-150 lines:
```typescript
const methods = generateMethods({
  write: { type: 'mutation', api: component.tuples.write, mapping: {...} },
  // ...
});
```

---

### 2.2 HIGH: Duplicate Type Definitions

**Files:**
- `src/client/index.ts` (lines 601-623)
- `src/component/permissions.ts` (lines 31-53)

`TraversalNode`, `TriedPath`, `PathResult` defined identically in both locations.

**Direction:** Move to shared types file, import in both.

---

## 3. React Module

### 3.1 LOW: Empty Placeholder Export

**File:** `src/react/index.ts`

```typescript
export const useMyComponent = () => {
  return {};
};
```

**Issue:** Placeholder stub with no functionality. Package.json exports it at `./react`.

**Direction:** Either implement actual hooks or remove the export entirely.

---

## 4. Example App

### 4.1 HIGH: Parallel Implementations (app.ts vs example.ts)

**Files:**
- `example/convex/app.ts` (~1100 lines)
- `example/convex/example.ts` (~300 lines)

**Duplicated functionality:**
| Feature | app.ts | example.ts |
|---------|--------|------------|
| Add/remove user from org | lines 146-217 | lines 30-66 |
| List org members | lines 222-244 | lines 71-82 |
| Resource management | various | lines 94-127 |
| Permission checking | various | lines 141-172 |
| Setup/cleanup | various | lines 222-290 |

**Direction:** Consolidate into single production-grade implementation. Remove or clearly document `example.ts` as reference-only.

---

### 4.2 HIGH: Schema Definitions in 4+ Places

**Locations:**
- `seed.ts` lines 57-63 (4 permissions)
- `app.ts` lines 1023-1027 (same 4 permissions)
- `seed.ts` lines 80-99 (11 relations)
- `app.ts` lines 1041-1055 (same 11 relations)
- `seed.ts` lines 1066-1100 (object types)
- `app.ts` lines 1066-1100 (same object types)
- UI files show example schemas

**Direction:** Single source of truth in `constants/schema.ts`.

---

### 4.3 MEDIUM: Repeated Enrichment Pattern

**File:** `example/convex/app.ts` (lines 231-243, 285-296, 374-387)

Same pattern 3+ times:
```typescript
const enriched = await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId);
    return { ...item, relatedName: related?.name ?? "Unknown" };
  })
);
```

**Direction:** Extract `enrichEntities(ctx, items, idField, nameField)`.

---

### 4.4 MEDIUM: Duplicate Entity Resolution

**Files:**
- `app.ts` lines 601-615 (`resolveSubject` in getAllTuples)
- `app.ts` lines 839-858 (same logic in `canWithPath`)

**Direction:** Move to shared utility module.

---

### 4.5 MEDIUM: Duplicate getOrCreate Helpers

**File:** `example/convex/seed.ts` (lines 172-225)

Four nearly identical helpers:
- `getOrCreateUser` (172-176)
- `getOrCreateOrg` (179-183)
- `getOrCreateResource` (201-209)
- `getOrCreateBooking` (212-225)

**Direction:** Factory function `makeGetOrCreate(tableName, fieldName, createApi)`.

---

### 4.6 MEDIUM: UI Component Duplication

**File:** `example/src/pages/permission-tester.tsx`

| Pattern | Lines | Repetitions |
|---------|-------|-------------|
| Permission badges | 298-357 | 3x (org/resource/booking) |
| Object selection blocks | 153-219 | 3x (same structure) |

**Direction:** Extract `<PermissionBadges>` and `<ObjectSelector>` components.

---

### 4.7 LOW: Duplicate Dark Mode Observer

**Files:**
- `example/src/components/traversal-graph.tsx` (lines 46-63)
- `example/src/pages/graph.tsx` (lines 82-99)

Identical `useEffect` with MutationObserver for dark class.

**Direction:** Extract `useDarkMode()` hook.

---

### 4.8 LOW: Unused/Dead Code

| File | Status |
|------|--------|
| `example/convex/example.ts` | Not used by UI |
| `example/src/pages/tuples.tsx` | Not in navigation |

**Direction:** Remove or integrate properly.

---

## 5. Tests and Configuration

### 5.1 HIGH: Triplicated Test Setup

**Files:**
- `src/component/setup.test.ts` (lines 7-10)
- `example/convex/setup.test.ts` (lines 10-14)
- `src/client/setup.test.ts` (lines 15-21)

Each defines nearly identical `initConvexTest()` helper.

**Direction:** Single shared test helper module.

---

### 5.2 MEDIUM: Duplicate Fake Timer Setup

**Files:**
- `src/component/lib.test.ts` (lines 8-13)
- `example/convex/example.test.ts` (lines 6-12)

Identical `beforeEach`/`afterEach` for fake timers.

**Direction:** Extract to Vitest setup file or shared utility.

---

### 5.3 MEDIUM: TSConfig Duplication

**Files:** 5 tsconfig files with overlapping settings

| File | Issue |
|------|-------|
| `example/tsconfig.json` | Re-defines ~15 options from root instead of extending |
| `tsconfig.test.json` | Minimal difference from root |
| `tsconfig.build.json` | Only adds include/exclude |

**Direction:** Have example extend root, consolidate test/build configs.

---

### 5.4 MEDIUM: ESLint Rule Duplication

**File:** `eslint.config.js` (lines 45-50 vs 81-86)

Same `no-unused-vars` and `no-explicit-any` rules in both worker and browser sections.

**Direction:** Extract shared rules to constant, merge programmatically.

---

### 5.5 LOW: Placeholder Tests

**Files:** 3 setup.test.ts files contain `test("setup", () => {});`

**Direction:** Remove empty tests.

---

### 5.6 LOW: Inconsistent Import Extensions

**Files:** Mixed `.js` and no-extension imports across test files.

**Direction:** Enforce consistent style via ESLint rule.

---

## 6. Priority Recommendations

### Tier 1: High Impact (Do First)

| Item | Files | Est. Lines Saved | Impact |
|------|-------|-----------------|--------|
| Unify `canRecursive` functions | permissions.ts | ~100 | Bug fix maintenance |
| Generate client methods | client/index.ts | ~400 | Major simplification |
| Consolidate app.ts/example.ts | example/convex/ | ~200 | Single source of truth |
| Shared test setup | 3 test files | ~40 | Test maintainability |

### Tier 2: Medium Impact

| Item | Files | Est. Lines Saved |
|------|-------|-----------------|
| Extract catalog helpers | permissionCatalog.ts, relationCatalog.ts | ~80 |
| Centralize schema definitions | seed.ts, app.ts | ~60 |
| Extract UI components | permission-tester.tsx | ~50 |
| Unify type definitions | client/index.ts, permissions.ts | ~30 |

### Tier 3: Low Impact (Cleanup)

| Item | Files |
|------|-------|
| Remove placeholder tests | 3 setup.test.ts |
| Remove/integrate dead code | example.ts, tuples.tsx |
| Fix import consistency | various |
| Remove empty react export | react/index.ts |
| Extract dark mode hook | 2 graph components |

---

## Metrics Summary

| Category | Duplicate Lines | Files Affected |
|----------|----------------|----------------|
| Permission recursion | ~150 | 1 |
| Client method wrappers | ~400 | 1 |
| Catalog patterns | ~124 | 2 |
| Example app duplication | ~300 | 2 |
| Test setup | ~40 | 3 |
| Schema definitions | ~100 | 4 |
| UI components | ~80 | 2 |
| **Total** | **~1200** | **15** |

**Estimated total reduction:** 800-1000 lines (30-40% of affected files)
