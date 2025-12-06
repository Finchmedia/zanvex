# Zanvex React Permission Manager

## Overview

Ship a ready-made React component that any app can drop in for visual permissions management. Abstracts away the DSL syntax with an intuitive UI.

## Usage

```tsx
// In your admin dashboard:
import { ZanvexPermissionManager } from "@mrfinch/zanvex/react";

function AdminSettings() {
  return (
    <ZanvexPermissionManager
      // Hooks into the component's API automatically
    />
  );
}
```

## Features

- **View** all permission rules
- **Create** new rules with a visual builder (not raw DSL)
- **Edit** existing rules
- **Delete** rules
- **Test** permissions ("Can user X do action Y on object Z?")

---

## Visual Rule Builder Concept

Instead of typing `parent->edit | booker`, users get a visual builder:

```
┌─────────────────────────────────────────────────────────────┐
│  New Permission Rule                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Object Type: [ booking      ▼ ]                            │
│  Permission:  [ cancel       ▼ ]                            │
│                                                             │
│  Who can do this?                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Direct relation                                    │   │
│  │   Users with [ booker ▼ ] relation                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ + Add another condition (OR) ]                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Inherited via relation                             │   │
│  │   Follow [ parent ▼ ] → check [ edit ▼ ] permission  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Preview: booking.cancel = parent->edit | booker           │
│                                                             │
│                              [ Cancel ]  [ Save Rule ]      │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
zanvex/
├── src/
│   ├── component/        # Convex functions (done!)
│   └── client/           # JS client (done!)
└── react/                # NEW: React components
    ├── index.ts
    ├── ZanvexPermissionManager.tsx   # Full admin UI
    ├── RuleBuilder.tsx               # Visual rule builder
    ├── RuleTester.tsx                # "Can X do Y?" tester
    └── hooks/
        ├── usePermissionRules.ts     # Query rules
        └── useCanCheck.ts            # Test permissions
```

---

## Component Capabilities

1. **Auto-detect object types** from existing tuples/rules
2. **Auto-suggest relations** based on what's been used
3. **Validate rules** before saving (no typos in relation names)
4. **Show dependencies** ("This rule depends on `resource.edit`")
5. **Live preview** the DSL as you build visually

---

## Implementation Phases

### Phase 1: Basic CRUD UI
- List all permission rules
- Add new rule (with DSL input)
- Edit existing rule
- Delete rule
- Simple, functional

### Phase 2: Visual Rule Builder
- Dropdown for object type
- Dropdown for permission name
- Visual "condition" cards (direct vs computed)
- OR logic with "+ Add condition" button
- Live DSL preview

### Phase 3: Permission Tester
- Select subject (type + id)
- Select action
- Select object (type + id)
- "Test" button → shows allowed/denied + traversal path

### Phase 4: Smart Features
- Auto-suggest object types from existing tuples
- Auto-suggest relations from existing tuples
- Dependency visualization
- "This rule is used by X other rules"

---

## Task Breakdown

| Task | Complexity | Priority |
|------|------------|----------|
| Basic rule list + CRUD UI | Small | P0 |
| Visual rule builder | Medium | P1 |
| Permission tester UI | Small | P1 |
| Auto-suggestions from existing data | Medium | P2 |
| Package as `@mrfinch/zanvex/react` | Small | P0 |
| Dependency visualization | Medium | P3 |

---

## DSL Reference

The visual builder generates this DSL:

| Syntax | Meaning | UI Representation |
|--------|---------|-------------------|
| `relation` | Direct check: does tuple exist? | "Direct relation" card |
| `rel->perm` | Follow relation, check permission on target | "Inherited via relation" card |
| `a \| b` | OR logic: either path grants access | Multiple condition cards |

**Examples:**
- `booker` → Direct relation check
- `owner->admin_of` → Follow `owner`, check `admin_of` on that object
- `parent->edit \| booker` → Either inherited edit OR direct booker

---

## Open Questions

1. Should we support AND logic? (Current DSL is OR-only)
2. How to handle deeply nested rules in the UI?
3. Should we show a "graph view" of the permission model?
4. Multi-tenant considerations - namespace rules by org?

---

## Related Files

- `src/component/rules.ts` - CRUD mutations for permission rules
- `src/component/permissions.ts` - `can()` query with recursive evaluation
- `src/component/dsl.ts` - DSL parser
- `src/client/index.ts` - Client API (`definePermission`, `can`, etc.)
