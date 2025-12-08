/**
 * App Layer - Test Harness
 *
 * These mutations simulate what a real app would do:
 * 1. Create data in app tables (users, orgs, resources)
 * 2. Sync relationships to Zanvex tuples
 *
 * This demonstrates the "dual-write" pattern where your app
 * maintains its own data AND mirrors permissions to Zanvex.
 */
import { mutation, query } from "./_generated/server.js";
import { api, components } from "./_generated/api.js";
import { createZanvexClient } from "@mrfinch/zanvex";
import { v } from "convex/values";

const zanvex = createZanvexClient(components.zanvex);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Create a user in the app
 * (No Zanvex tuple needed - users are just entities)
 */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("users", args);
    return id;
  },
});

/**
 * List all users
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Delete a user and clean up Zanvex tuples
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Remove from org_members
    const memberships = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }

    // Remove all Zanvex tuples for this user
    await zanvex.removeAllForSubject(ctx, { type: "user", id: userId });

    // Delete user
    await ctx.db.delete(userId);
  },
});

// ============================================
// ORG MANAGEMENT
// ============================================

/**
 * Create an organization
 * (No Zanvex tuple needed - orgs are just entities)
 */
export const createOrg = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("orgs", args);
    return id;
  },
});

/**
 * List all orgs
 */
export const listOrgs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orgs").collect();
  },
});

/**
 * Delete an org and clean up everything
 */
export const deleteOrg = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    // Remove all memberships
    const memberships = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }

    // Remove all resources
    const resources = await ctx.db
      .query("resources")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    for (const r of resources) {
      await zanvex.removeAllForObject(ctx, { type: "resource", id: r._id });
      await ctx.db.delete(r._id);
    }

    // Remove all Zanvex tuples for this org
    await zanvex.removeAllForObject(ctx, { type: "org", id: orgId });

    // Delete org
    await ctx.db.delete(orgId);
  },
});

// ============================================
// ORG MEMBERSHIP (The Key Integration!)
// ============================================

/**
 * Add a user to an org with a role
 *
 * THIS is where we sync to Zanvex:
 * - role "admin" → (org, admin_of, user)
 * - role "member" → (org, member_of, user)
 */
export const addUserToOrg = mutation({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { userId, orgId, role }) => {
    // Check if already member
    const existing = await ctx.db
      .query("org_members")
      .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
      .first();

    if (existing) {
      throw new Error("User already in org");
    }

    // 1. Store in app's join table
    await ctx.db.insert("org_members", { orgId, userId, role });

    // 2. Mirror to Zanvex
    const relation = role === "admin" ? "admin_of" : "member_of";
    await zanvex.write(
      ctx,
      { type: "org", id: orgId },
      relation,
      { type: "user", id: userId }
    );

    return { success: true };
  },
});

/**
 * Remove a user from an org
 */
export const removeUserFromOrg = mutation({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { userId, orgId }) => {
    // Find membership
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
      .first();

    if (!membership) {
      throw new Error("User not in org");
    }

    // Remove from app table
    await ctx.db.delete(membership._id);

    // Remove from Zanvex (both possible relations)
    await zanvex.remove(
      ctx,
      { type: "org", id: orgId },
      "admin_of",
      { type: "user", id: userId }
    );
    await zanvex.remove(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: userId }
    );

    return { success: true };
  },
});

/**
 * List org members (from app table)
 */
export const listOrgMembers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const memberships = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

// ============================================
// RESOURCE MANAGEMENT
// ============================================

/**
 * Create a resource owned by an org
 *
 * Syncs to Zanvex: (resource, owner, org)
 */
export const createResource = mutation({
  args: {
    name: v.string(),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { name, orgId }) => {
    // 1. Store in app table
    const id = await ctx.db.insert("resources", { name, orgId });

    // 2. Mirror ownership to Zanvex
    await zanvex.write(
      ctx,
      { type: "resource", id },
      "owner",
      { type: "org", id: orgId }
    );

    return id;
  },
});

/**
 * List resources (from app table)
 */
export const listResources = query({
  args: {},
  handler: async (ctx) => {
    const resources = await ctx.db.query("resources").collect();

    // Enrich with org data
    const enriched = await Promise.all(
      resources.map(async (r) => {
        const org = await ctx.db.get(r.orgId);
        return {
          ...r,
          orgName: org?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Delete a resource
 */
export const deleteResource = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, { resourceId }) => {
    // Remove Zanvex tuples
    await zanvex.removeAllForObject(ctx, { type: "resource", id: resourceId });

    // Delete resource
    await ctx.db.delete(resourceId);
  },
});

// ============================================
// BOOKING MANAGEMENT
// ============================================

/**
 * Create a booking for a resource
 *
 * Syncs to Zanvex:
 * - (booking, parent, resource) → booking belongs to resource (for traversal!)
 * - (booking, booker, user) → user is the booker (direct cancel access)
 *
 * With permission rules:
 *   booking.cancel = "parent->edit | booker"
 *   resource.edit = "owner->admin_of"
 *
 * Traversal path for org admin:
 *   user:daniel → admin_of → org:acme → owner → resource:studio-a → parent → booking:123
 */
export const createBooking = mutation({
  args: {
    title: v.string(),
    resourceId: v.id("resources"),
    bookerId: v.id("users"),
    start: v.string(),
  },
  handler: async (ctx, { title, resourceId, bookerId, start }) => {
    // 1. Store in app table
    const id = await ctx.db.insert("bookings", {
      title,
      resourceId,
      bookerId,
      start,
      status: "pending",
    });

    // 2. Mirror to Zanvex - booking's PARENT is the resource
    // This enables traversal: booking → parent → resource → owner → org → admin_of → user
    await zanvex.write(ctx, { type: "booking", id }, "parent", {
      type: "resource",
      id: resourceId,
    });

    // 3. Booker has direct relation (for "booker" rule in booking.cancel)
    await zanvex.write(ctx, { type: "booking", id }, "booker", {
      type: "user",
      id: bookerId,
    });

    return id;
  },
});

/**
 * List bookings (from app table)
 */
export const listBookings = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();

    // Enrich with resource and booker data
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const resource = await ctx.db.get(b.resourceId);
        const booker = await ctx.db.get(b.bookerId);
        return {
          ...b,
          resourceName: resource?.name ?? "Unknown",
          bookerName: booker?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Cancel a booking
 */
export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    await ctx.db.patch(bookingId, { status: "cancelled" });
  },
});

/**
 * Delete a booking
 */
export const deleteBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    // Remove Zanvex tuples
    await zanvex.removeAllForObject(ctx, { type: "booking", id: bookingId });

    // Delete booking
    await ctx.db.delete(bookingId);
  },
});

/**
 * Clear all app data (for fresh seeding)
 * WARNING: DESTRUCTIVE - deletes all users, orgs, resources, bookings
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Clearing app data...");

    // Delete all bookings
    const bookings = await ctx.db.query("bookings").collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }
    console.log(`  Deleted ${bookings.length} bookings`);

    // Delete all resources
    const resources = await ctx.db.query("resources").collect();
    for (const resource of resources) {
      await ctx.db.delete(resource._id);
    }
    console.log(`  Deleted ${resources.length} resources`);

    // Delete all org members
    const members = await ctx.db.query("org_members").collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }
    console.log(`  Deleted ${members.length} org members`);

    // Delete all orgs
    const orgs = await ctx.db.query("orgs").collect();
    for (const org of orgs) {
      await ctx.db.delete(org._id);
    }
    console.log(`  Deleted ${orgs.length} orgs`);

    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }
    console.log(`  Deleted ${users.length} users`);

    // Note: Component tables (tuples, catalogs) are cleared by Convex's data clear command
    // or by the component's internal reset functions

    return {
      deletedUsers: users.length,
      deletedOrgs: orgs.length,
      deletedOrgMembers: members.length,
      deletedResources: resources.length,
      deletedBookings: bookings.length,
    };
  },
});

/**
 * Get booking permissions for a user
 */
export const getBookingPermissions = query({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { userId, bookingId }) => {
    return await zanvex.getPermissionsForObject(ctx, {
      subject: { type: "user", id: userId },
      object: { type: "booking", id: bookingId },
    });
  },
});

/**
 * Get org permissions for a user
 */
export const getOrgPermissions = query({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { userId, orgId }) => {
    return await zanvex.getPermissionsForObject(ctx, {
      subject: { type: "user", id: userId },
      object: { type: "org", id: orgId },
    });
  },
});

// ============================================
// PERMISSION CHECKS (Using Zanvex!)
// ============================================

/**
 * Check if a user can manage a resource
 *
 * This is the magic: Zanvex traverses
 * user → admin_of → org → owner → resource
 */
export const canUserManageResource = query({
  args: {
    userId: v.id("users"),
    resourceId: v.id("resources"),
  },
  handler: async (ctx, { userId, resourceId }) => {
    // Use Zanvex's 1-hop traversal
    const canManage = await zanvex.check(
      ctx,
      { type: "resource", id: resourceId },
      "owner",
      { type: "user", id: userId }
    );

    return canManage;
  },
});

/**
 * Check if a user is admin of an org
 */
export const isUserOrgAdmin = query({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { userId, orgId }) => {
    return await zanvex.check(
      ctx,
      { type: "org", id: orgId },
      "admin_of",
      { type: "user", id: userId }
    );
  },
});

/**
 * Check if a user is member of an org (admin OR member)
 */
export const isUserOrgMember = query({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { userId, orgId }) => {
    const isAdmin = await zanvex.check(
      ctx,
      { type: "org", id: orgId },
      "admin_of",
      { type: "user", id: userId }
    );

    if (isAdmin) return true;

    return await zanvex.check(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: userId }
    );
  },
});

// ============================================
// INTROSPECTION
// ============================================

/**
 * Get all Zanvex tuples (for debugging)
 */
export const getAllTuples = query({
  args: {},
  handler: async (ctx) => {
    // This is a bit hacky - we're querying the component's table directly
    // In a real app, you'd use listTuplesForObject or listRelations
    // For the test harness, we want to see everything
    const users = await ctx.db.query("users").collect();
    const orgs = await ctx.db.query("orgs").collect();
    const resources = await ctx.db.query("resources").collect();
    const bookings = await ctx.db.query("bookings").collect();

    const allTuples: Array<{
      object: string;
      relation: string;
      subject: string;
    }> = [];

    // Helper to resolve subject to human-readable name
    const resolveSubject = (subjectType: string, subjectId: string) => {
      if (subjectType === "user") {
        const user = users.find((u) => u._id === subjectId);
        return `user:${user?.name ?? subjectId}`;
      }
      if (subjectType === "org") {
        const org = orgs.find((o) => o._id === subjectId);
        return `org:${org?.name ?? subjectId}`;
      }
      if (subjectType === "resource") {
        const resource = resources.find((r) => r._id === subjectId);
        return `resource:${resource?.name ?? subjectId}`;
      }
      return `${subjectType}:${subjectId}`;
    };

    // Get tuples for each org
    for (const org of orgs) {
      const tuples = await zanvex.listTuplesForObject(ctx, {
        type: "org",
        id: org._id,
      });
      for (const t of tuples) {
        allTuples.push({
          object: `org:${org.name}`,
          relation: t.relation,
          subject: resolveSubject(t.subjectType, t.subjectId),
        });
      }
    }

    // Get tuples for each resource
    for (const resource of resources) {
      const tuples = await zanvex.listTuplesForObject(ctx, {
        type: "resource",
        id: resource._id,
      });
      for (const t of tuples) {
        allTuples.push({
          object: `resource:${resource.name}`,
          relation: t.relation,
          subject: resolveSubject(t.subjectType, t.subjectId),
        });
      }
    }

    // Get tuples for each booking
    for (const booking of bookings) {
      const tuples = await zanvex.listTuplesForObject(ctx, {
        type: "booking",
        id: booking._id,
      });
      for (const t of tuples) {
        allTuples.push({
          object: `booking:${booking.title}`,
          relation: t.relation,
          subject: resolveSubject(t.subjectType, t.subjectId),
        });
      }
    }

    return allTuples;
  },
});

// ============================================
// PERMISSION RULES (Zanzibar-style DSL)
// ============================================

/**
 * Initialize permission rules for the example app
 *
 * Sets up Zanzibar-style CRUD rules:
 *   resource.create = "owner->admin_of"
 *   resource.read = "owner->admin_of | owner->member_of"
 *   resource.update = "owner->admin_of | owner->member_of"
 *   resource.delete = "owner->admin_of"
 *   booking.create = "parent->update"
 *   booking.read = "parent->read | booker"
 *   booking.update = "parent->update | booker"
 *   booking.delete = "parent->delete"
 */
export const initializePermissionRules = mutation({
  args: {},
  handler: async (ctx) => {
    // Resource permissions - check owner org's relations
    await zanvex.definePermission(
      ctx,
      "resource",
      "create",
      "owner->admin_of"
    );
    await zanvex.definePermission(
      ctx,
      "resource",
      "read",
      "owner->admin_of | owner->member_of"
    );
    await zanvex.definePermission(ctx, "resource", "update", "owner->admin_of | owner->member_of");
    await zanvex.definePermission(ctx, "resource", "delete", "owner->admin_of");

    // Booking permissions - traverse through parent resource
    await zanvex.definePermission(
      ctx,
      "booking",
      "create",
      "parent->update"
    );
    await zanvex.definePermission(
      ctx,
      "booking",
      "read",
      "parent->read | booker"
    );
    await zanvex.definePermission(
      ctx,
      "booking",
      "update",
      "parent->update | booker"
    );
    await zanvex.definePermission(ctx, "booking", "delete", "parent->delete");
  },
});

/**
 * List all permission rules
 */
export const listPermissionRules = query({
  args: {},
  handler: async (ctx) => {
    return await zanvex.listPermissionRules(ctx);
  },
});

/**
 * Define a permission rule
 */
export const definePermissionRule = mutation({
  args: {
    objectType: v.string(),
    permission: v.string(),
    expression: v.string(),
  },
  handler: async (ctx, { objectType, permission, expression }) => {
    await zanvex.definePermission(ctx, objectType, permission, expression);
  },
});

/**
 * Delete a permission rule
 */
export const deletePermissionRule = mutation({
  args: {
    objectType: v.string(),
    permission: v.string(),
  },
  handler: async (ctx, { objectType, permission }) => {
    await zanvex.deletePermissionRule(ctx, objectType, permission);
  },
});

/**
 * Get permissions a user has on a resource
 */
export const getResourcePermissions = query({
  args: {
    userId: v.id("users"),
    resourceId: v.id("resources"),
  },
  handler: async (ctx, { userId, resourceId }) => {
    return await zanvex.getPermissionsForObject(ctx, {
      subject: { type: "user", id: userId },
      object: { type: "resource", id: resourceId },
    });
  },
});

/**
 * Check if user can perform specific action on resource
 */
export const canUserDoAction = query({
  args: {
    userId: v.id("users"),
    resourceId: v.id("resources"),
    action: v.string(),
  },
  handler: async (ctx, { userId, resourceId, action }) => {
    return await zanvex.can(ctx, {
      subject: { type: "user", id: userId },
      action,
      object: { type: "resource", id: resourceId },
    });
  },
});

/**
 * Check permission with detailed traversal path
 *
 * For the permission tester graph visualization
 */
export const canWithPath = query({
  args: {
    userId: v.id("users"),
    action: v.string(),
    objectType: v.string(),
    objectId: v.string(),
  },
  handler: async (ctx, { userId, action, objectType, objectId }) => {
    const result = await zanvex.canWithPath(ctx, {
      subject: { type: "user", id: userId },
      action,
      object: { type: objectType, id: objectId },
    });

    // Helper to get display name for an entity
    const getDisplayName = async (nodeType: string, nodeId: string): Promise<string> => {
      try {
        if (nodeType === "user") {
          const user = await ctx.db.get(nodeId as any);
          return (user as any)?.name || nodeId;
        } else if (nodeType === "org") {
          const org = await ctx.db.get(nodeId as any);
          return (org as any)?.name || nodeId;
        } else if (nodeType === "resource") {
          const resource = await ctx.db.get(nodeId as any);
          return (resource as any)?.name || nodeId;
        } else if (nodeType === "booking") {
          const booking = await ctx.db.get(nodeId as any);
          return (booking as any)?.title || nodeId;
        }
        return nodeId;
      } catch {
        return nodeId;
      }
    };

    // Enrich path with display names
    if (result.path) {
      const enrichedPath = await Promise.all(
        result.path.map(async (node) => ({
          ...node,
          displayName: await getDisplayName(node.nodeType, node.nodeId),
        }))
      );
      result.path = enrichedPath;
    }

    // Enrich tried paths with display names
    if (result.triedPaths) {
      const enrichedTriedPaths = await Promise.all(
        result.triedPaths.map(async (triedPath) => {
          if (triedPath.partialPath) {
            const enrichedPartialPath = await Promise.all(
              triedPath.partialPath.map(async (node) => ({
                ...node,
                displayName: await getDisplayName(node.nodeType, node.nodeId),
              }))
            );
            return { ...triedPath, partialPath: enrichedPartialPath };
          }
          return triedPath;
        })
      );
      result.triedPaths = enrichedTriedPaths;
    }

    return result;
  },
});

// ============================================
// PERMISSION CATALOG
// ============================================

/**
 * List all permissions (for UI dropdowns)
 */
export const listPermissions = query({
  args: {},
  handler: async (ctx) => {
    return await zanvex.listPermissions(ctx);
  },
});

/**
 * Register a custom permission
 */
export const registerPermission = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("crud"), v.literal("action")),
  },
  handler: async (ctx, args) => {
    return await zanvex.registerPermission(ctx, args);
  },
});

// ============================================
// RELATION CATALOG
// ============================================

/**
 * List all relation names (for UI dropdowns)
 */
export const listRelationNames = query({
  args: {},
  handler: async (ctx) => {
    return await zanvex.listRelationNames(ctx);
  },
});

/**
 * Register a custom relation name
 */
export const registerRelationName = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await zanvex.registerRelationName(ctx, args);
  },
});

// ============================================
// OBJECT TYPES SCHEMA REGISTRY
// ============================================

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
  handler: async (ctx, args) => {
    return await zanvex.registerObjectType(ctx, args);
  },
});

/**
 * List all object types
 */
export const listObjectTypes = query({
  args: {},
  handler: async (ctx) => {
    return await zanvex.listObjectTypes(ctx);
  },
});

/**
 * Get a specific object type
 */
export const getObjectType = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await zanvex.getObjectType(ctx, name);
  },
});

/**
 * Delete an object type
 */
export const deleteObjectType = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await zanvex.deleteObjectType(ctx, name);
  },
});

/**
 * Get valid relations for an object type
 */
export const getRelationsForType = query({
  args: { objectType: v.string() },
  handler: async (ctx, { objectType }) => {
    return await zanvex.getRelationsForType(ctx, objectType);
  },
});

/**
 * Initialize permission catalog with default permissions
 */
export const initializePermissionCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    // CRUD Operations
    const permissions = [
      { name: "create", label: "Create", description: "Create new instances", category: "crud" as const },
      { name: "read", label: "Read", description: "View/read instances", category: "crud" as const },
      { name: "update", label: "Update", description: "Modify existing instances", category: "crud" as const },
      { name: "delete", label: "Delete", description: "Remove instances", category: "crud" as const },
    ];

    for (const perm of permissions) {
      await zanvex.registerPermission(ctx, perm);
    }
  },
});

/**
 * Initialize relation catalog with common relation names
 */
export const initializeRelationCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const relationNames = [
      { name: "parent", label: "parent", description: "Parent/container relation" },
      { name: "owner", label: "owner", description: "Ownership relation" },
      { name: "member_of", label: "member_of", description: "Membership relation" },
      { name: "admin_of", label: "admin_of", description: "Admin/manager relation" },
      { name: "booker", label: "booker", description: "Who made the booking" },
      { name: "assignee", label: "assignee", description: "Who is assigned/responsible" },
      { name: "creator", label: "creator", description: "Who created this instance" },
      { name: "viewer", label: "viewer", description: "Who can view" },
      { name: "editor", label: "editor", description: "Who can edit" },
    ];

    for (const rel of relationNames) {
      await zanvex.registerRelationName(ctx, rel);
    }
  },
});

/**
 * Initialize example object types for the demo app
 */
export const initializeObjectTypes = mutation({
  args: {},
  handler: async (ctx) => {
    // User type - no relations (leaf node)
    await zanvex.registerObjectType(ctx, {
      name: "user",
      description: "A user of the system",
      relations: [],
    });

    // Org type - has admin_of and member_of relations to users
    await zanvex.registerObjectType(ctx, {
      name: "org",
      description: "An organization",
      relations: [
        { name: "admin_of", targetType: "user", description: "User is an admin of this org" },
        { name: "member_of", targetType: "user", description: "User is a member of this org" },
      ],
    });

    // Resource type - owned by an org
    await zanvex.registerObjectType(ctx, {
      name: "resource",
      description: "A bookable resource like a studio",
      relations: [
        { name: "owner", targetType: "org", description: "The org that owns this resource" },
      ],
    });

    // Booking type - has parent resource and booker user
    await zanvex.registerObjectType(ctx, {
      name: "booking",
      description: "A booking for a resource",
      relations: [
        { name: "parent", targetType: "resource", description: "The resource being booked" },
        { name: "booker", targetType: "user", description: "The user who made the booking" },
      ],
    });
  },
});

/**
 * Initialize everything: catalogs, object types, and permission rules
 */
export const initializeAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Step 1: Initialize catalogs
    await ctx.runMutation(api.app.initializePermissionCatalog, {});
    await ctx.runMutation(api.app.initializeRelationCatalog, {});

    // Step 2: Initialize object types
    await ctx.runMutation(api.app.initializeObjectTypes, {});

    // Step 3: Initialize permission rules
    await ctx.runMutation(api.app.initializePermissionRules, {});
  },
});

// ============================================
// RESET
// ============================================

/**
 * Clear all app data AND Zanvex tuples + rules
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear app tables
    const users = await ctx.db.query("users").collect();
    const orgs = await ctx.db.query("orgs").collect();
    const resources = await ctx.db.query("resources").collect();
    const memberships = await ctx.db.query("org_members").collect();
    const bookings = await ctx.db.query("bookings").collect();

    for (const b of bookings) await ctx.db.delete(b._id);
    for (const m of memberships) await ctx.db.delete(m._id);
    for (const r of resources) await ctx.db.delete(r._id);
    for (const o of orgs) await ctx.db.delete(o._id);
    for (const u of users) await ctx.db.delete(u._id);

    // Clear Zanvex tuples
    const zanvexDeleted = await zanvex.clearAll(ctx);

    // Clear Zanvex permission rules
    const rulesDeleted = await zanvex.clearAllRules(ctx);

    // Clear Zanvex object types
    const objectTypesDeleted = await zanvex.clearAllObjectTypes(ctx);

    return {
      users: users.length,
      orgs: orgs.length,
      resources: resources.length,
      memberships: memberships.length,
      bookings: bookings.length,
      zanvexTuples: zanvexDeleted,
      zanvexRules: rulesDeleted,
      zanvexObjectTypes: objectTypesDeleted,
    };
  },
});
