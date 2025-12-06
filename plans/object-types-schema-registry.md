# Zanvex Object Types Schema Registry

## Overview

### The Problem

Zanvex currently operates in a vacuum. It stores tuples and permission rules as arbitrary strings without knowing:

1. **What object types exist** in the consuming application
2. **What relations are valid** between those types
3. **Whether a rule references real things** or contains typos

This leads to:
- Hardcoded dropdowns in UI
- No autocomplete or validation
- Typos silently break permissions
- No self-documentation of the permission model

### The Solution

Add a **schema registry** layer where applications declare their object types and valid relations. This becomes the source of truth for:
- UI dropdown population
- Rule builder validation
- Documentation/introspection

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Zanvex Component                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │  object_types   │  ← NEW: Schema registry                    │
│  │  (what exists)  │                                            │
│  └────────┬────────┘                                            │
│           │ validates/populates                                 │
│           ▼                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ permission_rules│     │    relations    │                    │
│  │ (how to check)  │     │ (stored tuples) │                    │
│  └─────────────────┘     └─────────────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      ▼                                          │
│              ┌──────────────┐                                   │
│              │    can()     │                                   │
│              │ (evaluation) │                                   │
│              └──────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schema Design

### New Table: `object_types`

```typescript
// src/component/schema.ts

object_types: defineTable({
  name: v.string(),              // "booking", "resource", "org", "user"
  description: v.optional(v.string()), // Human-readable description
  relations: v.array(
    v.object({
      name: v.string(),          // "parent", "owner", "booker", "admin_of"
      targetType: v.string(),    // What type the relation points to
      description: v.optional(v.string()), // "The resource this booking belongs to"
    })
  ),
})
  .index("by_name", ["name"])
```

### Example Data

```json
[
  {
    "name": "user",
    "description": "End users of the system",
    "relations": []
  },
  {
    "name": "org",
    "description": "Organizations that own resources",
    "relations": [
      { "name": "admin_of", "targetType": "user", "description": "Users who can manage the org" },
      { "name": "member_of", "targetType": "user", "description": "Users who belong to the org" }
    ]
  },
  {
    "name": "resource",
    "description": "Bookable resources like rooms or equipment",
    "relations": [
      { "name": "owner", "targetType": "org", "description": "The org that owns this resource" }
    ]
  },
  {
    "name": "booking",
    "description": "A reservation on a resource",
    "relations": [
      { "name": "parent", "targetType": "resource", "description": "The resource being booked" },
      { "name": "booker", "targetType": "user", "description": "The user who made the booking" }
    ]
  }
]
```

### Relation Direction Clarification

Relations flow from **object → subject** (same as tuples):

```
Tuple: (booking:123, parent, resource:studio-a)
       └─ object ─┘  └rel─┘  └─── subject ───┘

Schema: booking type has relation "parent" targeting "resource" type
```

This means:
- A `booking` can have a `parent` that is a `resource`
- A `resource` can have an `owner` that is an `org`
- An `org` can have `admin_of` that is a `user`

---

## CRUD Operations

### File: `src/component/object-types.ts` (NEW)

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

/**
 * Register or update an object type with its relations
 */
export const registerObjectType = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    relations: v.array(
      v.object({
        name: v.string(),
        targetType: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("object_types"),
  handler: async (ctx, { name, description, relations }) => {
    // Upsert: check if type already exists
    const existing = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { description, relations });
      return existing._id;
    }

    return await ctx.db.insert("object_types", { name, description, relations });
  },
});

/**
 * Get a specific object type
 */
export const getObjectType = query({
  args: { name: v.string() },
  returns: v.union(
    v.object({
      name: v.string(),
      description: v.optional(v.string()),
      relations: v.array(
        v.object({
          name: v.string(),
          targetType: v.string(),
          description: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, { name }) => {
    const type = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!type) return null;

    return {
      name: type.name,
      description: type.description,
      relations: type.relations,
    };
  },
});

/**
 * List all object types
 */
export const listObjectTypes = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      description: v.optional(v.string()),
      relations: v.array(
        v.object({
          name: v.string(),
          targetType: v.string(),
          description: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    const types = await ctx.db.query("object_types").collect();

    return types.map((t) => ({
      name: t.name,
      description: t.description,
      relations: t.relations,
    }));
  },
});

/**
 * Delete an object type
 *
 * WARNING: Does not cascade delete rules or tuples
 */
export const deleteObjectType = mutation({
  args: { name: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { name }) => {
    const existing = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});

/**
 * Clear all object types
 */
export const clearAllObjectTypes = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const types = await ctx.db.query("object_types").collect();

    for (const type of types) {
      await ctx.db.delete(type._id);
    }

    return types.length;
  },
});

/**
 * Get valid relations for an object type
 * (Helper for UI dropdowns)
 */
export const getRelationsForType = query({
  args: { objectType: v.string() },
  returns: v.array(
    v.object({
      name: v.string(),
      targetType: v.string(),
      description: v.optional(v.string()),
    })
  ),
  handler: async (ctx, { objectType }) => {
    const type = await ctx.db
      .query("object_types")
      .withIndex("by_name", (q) => q.eq("name", objectType))
      .first();

    return type?.relations ?? [];
  },
});

/**
 * Get all permissions defined for an object type
 * (Derived from permission_rules table)
 */
export const getPermissionsForType = query({
  args: { objectType: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, { objectType }) => {
    const rules = await ctx.db
      .query("permission_rules")
      .withIndex("by_type_permission", (q) => q.eq("objectType", objectType))
      .collect();

    return rules.map((r) => r.permission);
  },
});
```

---

## Client API Updates

### File: `src/client/index.ts`

Add new methods to the client:

```typescript
// ============================================
// OBJECT TYPES (Schema Registry)
// ============================================

/**
 * Register an object type with its valid relations
 *
 * @example
 * await zanvex.registerObjectType(ctx, "booking", [
 *   { name: "parent", targetType: "resource" },
 *   { name: "booker", targetType: "user" },
 * ]);
 */
registerObjectType: (
  ctx: MutationCtx,
  name: string,
  relations: Array<{
    name: string;
    targetType: string;
    description?: string;
  }>,
  description?: string
) => {
  return ctx.runMutation(component.objectTypes.registerObjectType, {
    name,
    description,
    relations,
  });
},

/**
 * Get a specific object type definition
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
 * Get permissions defined for an object type (derived from rules)
 */
getPermissionsForType: (ctx: QueryCtx, objectType: string) => {
  return ctx.runQuery(component.objectTypes.getPermissionsForType, { objectType });
},
```

---

## React UI Components

### File Structure

```
zanvex/
└── react/
    ├── index.ts
    ├── ZanvexPermissionManager.tsx    # Full admin UI (wraps everything)
    ├── ObjectTypeManager.tsx          # NEW: Object types CRUD UI
    ├── ObjectTypeEditor.tsx           # NEW: Add/edit single type
    ├── RelationEditor.tsx             # NEW: Add/edit relations on a type
    ├── RuleManager.tsx                # Permission rules CRUD UI
    ├── RuleBuilder.tsx                # Visual rule builder
    ├── RuleTester.tsx                 # "Can X do Y?" tester
    └── hooks/
        ├── useObjectTypes.ts          # NEW: Query object types
        ├── usePermissionRules.ts
        └── useCanCheck.ts
```

### ObjectTypeManager UI Concept

```
┌─────────────────────────────────────────────────────────────────┐
│  Object Types                                          [+ Add]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  📦 booking                                    [Edit] [×] │ │
│  │  "A reservation on a resource"                            │ │
│  │                                                           │ │
│  │  Relations:                                               │ │
│  │    parent → resource    "The resource being booked"       │ │
│  │    booker → user        "The user who made the booking"   │ │
│  │                                                           │ │
│  │  Permissions: view, cancel, delete (from rules)           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  📦 resource                                   [Edit] [×] │ │
│  │  "Bookable resources like rooms or equipment"             │ │
│  │                                                           │ │
│  │  Relations:                                               │ │
│  │    owner → org          "The org that owns this resource" │ │
│  │                                                           │ │
│  │  Permissions: view, edit, delete (from rules)             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  📦 org                                        [Edit] [×] │ │
│  │  "Organizations that own resources"                       │ │
│  │                                                           │ │
│  │  Relations:                                               │ │
│  │    admin_of → user      "Users who can manage the org"    │ │
│  │    member_of → user     "Users who belong to the org"     │ │
│  │                                                           │ │
│  │  Permissions: (none defined)                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  📦 user                                       [Edit] [×] │ │
│  │  "End users of the system"                                │ │
│  │                                                           │ │
│  │  Relations: (none - users are subjects, not objects)      │ │
│  │                                                           │ │
│  │  Permissions: (none defined)                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ObjectTypeEditor Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Object Type: booking                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Name:        [ booking                               ]         │
│  Description: [ A reservation on a resource           ]         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Relations                                            [+ Add]   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Relation: [ parent    ▼ ]  Target: [ resource  ▼ ]  [×] │   │
│  │  Description: [ The resource being booked          ]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Relation: [ booker    ▼ ]  Target: [ user      ▼ ]  [×] │   │
│  │  Description: [ The user who made the booking      ]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
│                              [ Cancel ]  [ Save Object Type ]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration: How Rule Builder Uses Object Types

Once object types are registered, the Rule Builder from `react-permission-manager.md` gets smarter:

```
┌─────────────────────────────────────────────────────────────────┐
│  New Permission Rule                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Object Type: [ booking      ▼ ]  ← Dropdown from object_types  │
│  Permission:  [ cancel       ▼ ]  ← Text input or derived list  │
│                                                                 │
│  Who can do this?                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Direct relation                                       │   │
│  │   Users with [ booker ▼ ] relation                      │   │
│  │               ↑                                         │   │
│  │   Dropdown only shows: parent, booker (from schema)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ + Add another condition (OR) ]                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Inherited via relation                                │   │
│  │   Follow [ parent ▼ ] → check [ edit ▼ ] permission     │   │
│  │          ↑                     ↑                        │   │
│  │   From schema    Permissions on "resource" (target)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Preview: booking.cancel = parent->edit | booker               │
│                                                                 │
│                              [ Cancel ]  [ Save Rule ]          │
└─────────────────────────────────────────────────────────────────┘
```

**Key enhancement:** When you select `parent` as the source relation, the UI knows:
1. `parent` targets `resource` (from object_types)
2. So the permission dropdown shows permissions defined on `resource` type

---

## Validation Considerations

### Option A: Soft Validation (Recommended for Phase 1)

- Object types are informational only
- Rules/tuples don't require matching object types
- UI shows warnings but allows saving
- Backwards compatible with existing data

### Option B: Strict Validation (Future Enhancement)

- `write()` rejects tuples with unknown object types
- `definePermission()` validates against schema
- Requires migration of existing data

### Recommendation

Start with **Option A**. Let object types inform the UI without breaking existing functionality. Add strict mode as opt-in later:

```typescript
createZanvexClient(component, { strictValidation: true })
```

---

## Open Questions

### 1. Circular Relations?

Can `org` have a relation to `org`? (e.g., `parent_org → org` for nested orgs)

**Recommendation:** Allow it. The schema shouldn't prevent valid use cases.

### 2. Relation Name Uniqueness?

Can both `booking` and `resource` have a relation named `owner`?

**Recommendation:** Yes, relation names are scoped to the object type.

### 3. Subject Types vs Object Types?

Currently `user` is listed as an object type but typically only appears as a subject (target of relations). Should we distinguish?

**Options:**
- A) Keep it simple: all types are equal
- B) Add `isSubjectOnly: boolean` flag
- C) Separate `subject_types` table

**Recommendation:** Option A for now. `user` having no relations is self-documenting.

### 4. Cascade Deletes?

When deleting an object type, what happens to:
- Rules that reference it?
- Tuples that use it?

**Recommendation:** Soft delete / warn only. Let users clean up manually.

---

## Implementation Phases

### Phase 1: Core Schema + CRUD

| Task | File | Complexity |
|------|------|------------|
| Add `object_types` table to schema | `schema.ts` | Small |
| Create `object-types.ts` with CRUD | `object-types.ts` | Medium |
| Update `convex.config.ts` exports | `convex.config.ts` | Small |
| Add client API methods | `client/index.ts` | Small |
| Update example app | `example/convex/app.ts` | Small |

### Phase 2: Example App UI

| Task | File | Complexity |
|------|------|------------|
| Add ObjectTypes display card | `example/src/App.tsx` | Medium |
| Initialize default object types | `example/convex/app.ts` | Small |

### Phase 3: React Permission Manager Integration

| Task | File | Complexity |
|------|------|------------|
| Create `ObjectTypeManager.tsx` | `react/` | Medium |
| Create `ObjectTypeEditor.tsx` | `react/` | Medium |
| Update `RuleBuilder.tsx` to use schema | `react/` | Medium |
| Create `useObjectTypes.ts` hook | `react/hooks/` | Small |

### Phase 4: Validation (Optional)

| Task | Complexity |
|------|------------|
| Add soft validation warnings in UI | Medium |
| Add strict validation mode option | Medium |
| Migration tooling for existing data | Large |

---

## Files to Modify

| File | Action |
|------|--------|
| `src/component/schema.ts` | Add `object_types` table |
| `src/component/object-types.ts` | NEW - CRUD operations |
| `src/component/convex.config.ts` | Export new module |
| `src/client/index.ts` | Add client API methods |
| `example/convex/app.ts` | Add init + example functions |
| `example/src/App.tsx` | Add UI card for object types |

---

## Success Criteria

- [ ] `object_types` table created and indexed
- [ ] CRUD operations work (register, get, list, delete)
- [ ] Client API exposes all operations
- [ ] Example app can register and display object types
- [ ] `getRelationsForType` returns valid relations for UI dropdowns
- [ ] `getPermissionsForType` derives permissions from rules table
- [ ] Documentation updated with new API

---

## Related Plans

- `react-permission-manager.md` - UI that will consume this schema
- Eventual: Integration guide for connecting Zanvex to real apps
