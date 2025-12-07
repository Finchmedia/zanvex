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
# Clear all data (app tables + Zanvex)
npx convex run app:clearAll

# Clear only catalogs
npx convex run seed:clearCatalogs
```

**Warning:** These operations are destructive and cannot be undone!

## Using the Convex Dashboard

You can also run these functions directly from the Convex Dashboard:

1. Navigate to your project: https://dashboard.convex.dev
2. Go to "Functions" tab
3. Find `seed:seedAll` (or any other seed function)
4. Click "Run" with no arguments

## Idempotency

All seed functions are **idempotent** - safe to run multiple times:
- Existing entries won't be duplicated
- New entries will be added
- The function returns counts of created vs. existing items

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
