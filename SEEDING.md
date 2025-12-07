# Zanvex Database Seeding

This guide explains how to seed the Zanvex database with default permissions and relations.

## Quick Start

### Option 1: Seed Everything at Once (Recommended)

```bash
cd example
npx convex run seed:seedAll
```

This will populate:
- **Permission Catalog**: 12 permissions (CRUD + common actions)
- **Relation Catalog**: 11 relation names (parent, owner, member_of, etc.)
- **Object Types**: 4 types (user, org, resource, booking)
- **Permission Rules**: 6 rules for the booking system example

### Option 2: Seed Individual Tables

```bash
# Seed only permissions
npx convex run seed:seedPermissions

# Seed only relations
npx convex run seed:seedRelations

# Seed only object types
npx convex run seed:seedObjectTypes

# Seed only permission rules
npx convex run seed:seedPermissionRules
```

### Option 3: Auto-seed on First Load

The UI pages automatically initialize their data on first load:
1. Start the dev server: `npm run dev`
2. Visit the Object Types page - auto-initializes object types
3. Visit the Permission Rules page - auto-initializes rules

The catalogs will be seeded when `initializeAll()` is called.

## What Gets Seeded

### Permission Catalog

**CRUD Operations:**
- `create` - Create new instances
- `read` - View/read instances
- `update` - Modify existing instances
- `delete` - Remove instances

**Common Actions:**
- `view` - View/access
- `edit` - Edit/modify
- `cancel` - Cancel/revoke an action
- `reschedule` - Change timing
- `approve` - Grant approval
- `reject` - Deny/reject
- `publish` - Make public
- `archive` - Archive/deactivate

### Relation Catalog

**Structural:**
- `parent` - Parent/container relation
- `owner` - Ownership relation
- `child` - Child/contained relation

**Membership:**
- `member_of` - Membership relation
- `admin_of` - Admin/manager relation

**Assignment:**
- `booker` - Who made the booking
- `assignee` - Who is assigned/responsible
- `creator` - Who created this instance

**Permission-based:**
- `viewer` - Who can view
- `editor` - Who can edit
- `collaborator` - Who can collaborate

### Object Types (Example)

- `user` - A user of the system (no relations - leaf node)
- `org` - An organization (admin_of → user, member_of → user)
- `resource` - A bookable resource (owner → org)
- `booking` - A booking (parent → resource, booker → user)

### Permission Rules (Example)

```typescript
resource.view = "owner->admin_of | owner->member_of"
resource.edit = "owner->admin_of"
resource.delete = "owner->admin_of"
booking.view = "parent->view | booker"
booking.cancel = "parent->edit | booker"
booking.delete = "parent->delete"
```

## Demo Data Seeding

### Quick Start

Seed realistic demo data to explore Zanvex permissions:

```bash
# Seed catalogs + demo data in one command
npx convex run seed:seedAll '{"includeDemoData": true}'

# Or seed demo data separately (after catalogs)
npx convex run seed:seedDemoData
```

This creates:
- **2 Organizations**: Acme Studio, BetaCo Studio
- **4 Users**: Alice (Acme admin), Bob (Acme member), Charlie (BetaCo admin), Diana (BetaCo member)
- **4 Resources**: Studio A/B (Acme), Studio X/Y (BetaCo)
- **8 Bookings**: 2 per resource (6 confirmed, 2 pending)
- **24 Zanvex Tuples**: Auto-created via dual-write pattern

### Demo Data Structure

**Acme Studio (slug: "acme"):**
- Alice (alice@acme.com) - Admin
- Bob (bob@acme.com) - Member
- Resources: Studio A, Studio B
- Bookings:
  - Studio A: Morning Session (Alice, +2d), Afternoon Session (Bob, +3d)
  - Studio B: Evening Session (Alice, +5d), Night Session (Bob, +7d)

**BetaCo Studio (slug: "betaco"):**
- Charlie (charlie@betaco.com) - Admin
- Diana (diana@betaco.com) - Member
- Resources: Studio X, Studio Y
- Bookings:
  - Studio X: Weekend Session (Charlie, +10d), Weekday Session (Diana, +12d)
  - Studio Y: Premium Session (Charlie, +15d), Standard Session (Diana, +18d)

### Permission Testing Scenarios

Use demo data to test Zanvex permissions:

**Scenario 1: Org-wide resource access**
- Alice (Acme admin) can view/edit all Acme resources
- Bob (Acme member) can view Acme resources but not edit
- Charlie cannot access Acme resources (different org)

**Scenario 2: Booking permissions**
- Alice can cancel her own bookings (direct booker)
- Alice can cancel Bob's bookings (admin traversal: parent->edit)
- Bob can cancel his own bookings (direct booker)
- Bob cannot cancel Alice's bookings (member, not admin)

**Scenario 3: Cross-org isolation**
- Acme users have zero access to BetaCo resources/bookings
- BetaCo users have zero access to Acme resources/bookings

### Idempotency

`seedDemoData()` is safe to run multiple times:
- Checks for existing entities by email/slug/name
- Skips creation if already exists
- Returns existing IDs in result

### Cleanup

Remove demo data without affecting catalogs:

```bash
npx convex run seed:clearDemoData
```

This deletes:
- All demo users (by email)
- All demo orgs (by slug)
- All demo resources (by name)
- All demo bookings (by title)
- All associated Zanvex tuples (auto-cleanup via app deletion functions)

**Preserves:**
- Permission catalog (12 permissions)
- Relation catalog (11 relations)
- Object types (4 types)
- Permission rules (6 rules)

## Adding Custom Permissions or Relations

You can extend the catalogs via the API:

```typescript
// Add a custom permission
await ctx.runMutation(api.app.registerPermission, {
  name: "review",
  label: "Review",
  description: "Review and provide feedback",
  category: "action"
});

// Add a custom relation
await ctx.runMutation(api.app.registerRelationName, {
  name: "reviewer",
  label: "reviewer",
  description: "Who reviews this instance"
});
```

Or edit `example/convex/seed.ts` and add them to the arrays.

## Clearing the Database

To reset everything:

```bash
# Clear all data (app tables + Zanvex catalogs + tuples + rules)
npx convex run app:clearAll
```

**Warning:** This operation is destructive and cannot be undone! It will delete:
- All app data (users, orgs, resources, bookings)
- All Zanvex tuples
- All permission rules
- All object types
- Note: Permission and relation catalogs are preserved (use re-seeding if needed)

## Using the Convex Dashboard

You can also run these functions directly from the Convex Dashboard:

1. Navigate to your project: https://dashboard.convex.dev
2. Go to "Functions" tab
3. Find `seed:seedAll` (or any other seed function)
4. Click "Run" with no arguments

## Idempotency

All seed functions are **idempotent** - safe to run multiple times:
- Existing entries won't be duplicated (handled by component API)
- `registerPermission()` and `registerRelationName()` are upserts
- Re-running updates existing entries and ensures they're active
- Object types and rules are also idempotent (won't create duplicates)

## Architecture

The seeding system uses two approaches:

1. **Internal Mutations** (in `src/component/permissionCatalog.ts` and `relationCatalog.ts`):
   - Called programmatically
   - Direct database inserts
   - Used by component initialization

2. **Public Mutations** (in `example/convex/app.ts`):
   - Callable from frontend
   - Call the component's public API
   - Used by UI auto-initialization

The `seed.ts` script uses the internal approach for efficiency.
