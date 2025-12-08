# Zanvex

[![npm version](https://badge.fury.io/js/@mrfinch%2Fzanvex.svg)](https://badge.fury.io/js/@mrfinch%2Fzanvex)

A Google Zanzibar-inspired authorization system for Convex. Implements Relationship-Based Access Control (ReBAC) with tuple-based permissions and graph traversal.

**Features:**
- Relationship-based permissions (inspired by Google Zanzibar)
- Flexible permission rules with DSL (e.g., `"owner->admin_of | owner->member_of"`)
- Graph traversal for indirect permissions
- Built-in permission catalogs (permissions, relations, object types)
- Interactive demo with permission tester and visualization

Found a bug or have a feature request? [File it here](https://github.com/finchmedia/zanvex/issues).

---

## Quick Start (Development)

Try the example app with interactive permission testing:

### 1. Clone and Install

```bash
git clone https://github.com/finchmedia/zanvex.git
cd zanvex
npm install
```

### 2. Set Up Convex

On first run, you'll need to create a Convex project:

```bash
npx convex dev
# Follow prompts to:
# - Log in or create a Convex account
# - Create or link a project
# This creates .env.local with your deployment URL
```

### 3. Seed Demo Data

Populate the database with demo organizations, users, resources, and bookings:

```bash
npx convex run seed:seedFresh
```

This creates:
- 2 organizations (ACME Studio, BetaCo Studio)
- 4 org members (Alice, Bob, Charlie, Diana)
- 4 external customers (CustomerA-D)
- 4 resources (Studio A, B, X, Y)
- 4 bookings (1 per resource)
- 11 permission rules (org, resource, booking CRUD)

### 4. Start Development Servers

```bash
npm run dev
```

This runs:
- Convex backend (`convex dev`)
- Vite frontend dev server
- Component build watcher

### 5. Explore the Demo

Open [http://localhost:5173](http://localhost:5173)

**Demo Features:**
- **App Data:** View organizations, users, resources, bookings
- **Permission Tester:** Test permissions with interactive UI
  - Select user, action, and object
  - See ALLOWED/DENIED results
  - Visualize permission check paths with React Flow graph
- **Permission Rules:** View and manage CRUD rules
- **Catalogs:** Manage permissions, relations, and object types

---

## Installation (Production Use)

Install the component in your Convex app:

```bash
npm install @mrfinch/zanvex
```

### Configure Your App

Create or update `convex/convex.config.ts`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import zanvex from "@mrfinch/zanvex/convex.config.js";

const app = defineApp();
app.use(zanvex);

export default app;
```

---

## Usage

### Initialize Component

Create permission catalogs and rules on first run:

```ts
// convex/seed.ts
import { components } from "./_generated/api";
import { api } from "./_generated/api";

export const initializeZanvex = mutation({
  handler: async (ctx) => {
    // Initialize default permissions (create, read, update, delete)
    await ctx.runMutation(components.zanvex.permissionCatalog.initializePermissions);

    // Define custom relations
    await ctx.runMutation(components.zanvex.relationCatalog.registerRelation, {
      name: "admin_of",
      label: "Admin of"
    });

    // Define object types
    await ctx.runMutation(components.zanvex.objectTypes.register, {
      name: "org",
      label: "Organization"
    });

    // Define permission rules
    await ctx.runMutation(components.zanvex.permissionRules.define, {
      objectType: "org",
      permission: "update",
      rule: "admin_of"
    });
  }
});
```

### Create Tuples (Assign Permissions)

```ts
import { components } from "./_generated/api";

// Make Alice an admin of ACME org
export const makeUserOrgAdmin = mutation({
  args: { userId: v.id("users"), orgId: v.id("orgs") },
  handler: async (ctx, { userId, orgId }) => {
    await ctx.runMutation(components.zanvex.lib.createTuple, {
      object: { type: "org", id: orgId },
      relation: "admin_of",
      subject: { type: "user", id: userId }
    });
  }
});
```

### Check Permissions

```ts
import { components } from "./_generated/api";

// Check if user can update org
export const canUserUpdateOrg = query({
  args: { userId: v.id("users"), orgId: v.id("orgs") },
  handler: async (ctx, { userId, orgId }) => {
    const result = await ctx.runQuery(components.zanvex.lib.can, {
      subject: { type: "user", id: userId },
      action: "update",
      object: { type: "org", id: orgId }
    });

    return result.allowed;
  }
});
```

### Example: Dual-Write Pattern

Maintain app tables and Zanvex tuples together:

```ts
// Create org and assign admin in one mutation
export const createOrg = mutation({
  args: { name: v.string(), adminUserId: v.id("users") },
  handler: async (ctx, { name, adminUserId }) => {
    // 1. Create org in app table
    const orgId = await ctx.db.insert("orgs", { name });

    // 2. Create Zanvex tuple (admin relation)
    await ctx.runMutation(components.zanvex.lib.createTuple, {
      object: { type: "org", id: orgId },
      relation: "admin_of",
      subject: { type: "user", id: adminUserId }
    });

    return orgId;
  }
});
```

---

## Permission Rules DSL

Zanvex supports Zanzibar-style permission expressions:

### Direct Relations
```ts
"admin_of"           // User has direct admin_of relation to object
"member_of"          // User has direct member_of relation to object
```

### Computed Relations (Traversal)
```ts
"owner->admin_of"    // User is admin of the owner of this object
"parent->update"     // User can update the parent of this object
```

### Union (OR)
```ts
"admin_of | member_of"                    // User is admin OR member
"owner->admin_of | owner->member_of"      // User is admin OR member of owner
```

### Example Rules
```ts
// Org permissions
org.read = "admin_of | member_of"         // Admins and members can read
org.update = "admin_of"                   // Only admins can update

// Resource permissions (owned by orgs)
resource.create = "owner->admin_of"       // Admin of owner org can create
resource.update = "owner->admin_of | owner->member_of"  // Admin or member

// Booking permissions (parent is resource)
booking.read = "booker"                   // Booker can read their booking
booking.update = "booker | parent->owner->admin_of"  // Booker OR org admin
```

---

## Architecture

### Component Structure

```
src/
├── component/          # Convex component (backend)
│   ├── lib.ts         # Main API: createTuple, deleteTuple, can
│   ├── schema.ts      # Tuple storage schema
│   ├── permissionCatalog.ts
│   ├── relationCatalog.ts
│   ├── objectTypes.ts
│   └── permissionRules.ts
├── client/
│   └── index.ts       # Client-side API wrapper
└── react/
    └── index.ts       # React hooks (future)

example/
├── convex/
│   ├── app.ts         # Example app functions
│   └── seed.ts        # Demo data seeding
└── src/
    └── pages/
        └── permission-tester.tsx  # Interactive UI
```

### Key Concepts

**Tuples:** Subject-Relation-Object triples
```ts
{
  object: { type: "org", id: "123" },
  relation: "admin_of",
  subject: { type: "user", id: "456" }
}
```

**Permission Rules:** Define how permissions are computed
```ts
{
  objectType: "resource",
  permission: "update",
  rule: "owner->admin_of | owner->member_of"
}
```

**Graph Traversal:** Permission checks walk the relationship graph to find valid paths from subject to object.

---

## Development

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run typecheck
```

### Lint
```bash
npm run lint
```

### Build Component
```bash
npm run build
```

### Publish
```bash
npm run alpha    # Alpha release
npm run release  # Production release
```

---

## Component Directory Structure

```
.
├── README.md           # This file
├── package.json        # Component metadata
├── src/
│   ├── component/      # Convex component backend
│   ├── client/         # Client SDK
│   └── react/          # React hooks/components
├── example/            # Example app
│   ├── convex/         # Backend functions
│   └── src/            # Frontend (Vite + React)
└── dist/               # Build artifacts (gitignored)
```

---

## Seed Script Reference

The example app includes a comprehensive seed script:

```bash
# Nuclear option: Clear ALL data and re-seed
npx convex run seed:seedFresh

# Seed without clearing (incremental)
npx convex run seed:seedAll

# Individual seeding functions
npx convex run seed:seedPermissions
npx convex run seed:seedRelations
npx convex run seed:seedObjectTypes
npx convex run seed:seedPermissionRules
npx convex run seed:seedDemoData
```

See `example/convex/seed.ts` for full documentation.

---

## License

Apache-2.0

---

## Contributing

Contributions are welcome! Please open an issue or PR on [GitHub](https://github.com/finchmedia/zanvex).
