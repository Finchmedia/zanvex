/**
 * Zanvex Example - ReBAC Permission Management
 *
 * This demonstrates how to use the Zanvex component for
 * relationship-based access control in a booking system.
 *
 * Scenario:
 * - Organizations own resources (studios, rooms)
 * - Users are members of organizations
 * - Users inherit access to resources via org membership
 */
import { mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { createZanvexClient } from "@mrfinch/zanvex";
import { v } from "convex/values";

// Create the Zanvex client
const zanvex = createZanvexClient(components.zanvex);

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

/**
 * Add a user to an organization
 *
 * Creates: (org:acme, member_of, user:daniel)
 * Meaning: "org acme has member daniel"
 */
export const addUserToOrg = mutation({
  args: {
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, { userId, orgId }) => {
    await zanvex.write(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: userId }
    );
    return { success: true };
  },
});

/**
 * Remove a user from an organization
 *
 * This immediately revokes all access the user had
 * via this org membership (Convex handles invalidation).
 */
export const removeUserFromOrg = mutation({
  args: {
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, { userId, orgId }) => {
    const deleted = await zanvex.remove(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: userId }
    );
    return { deleted };
  },
});

/**
 * List all members of an organization
 */
export const listOrgMembers = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, { orgId }) => {
    return await zanvex.listSubjects(
      ctx,
      { type: "org", id: orgId },
      "member_of"
    );
  },
});

// ============================================
// RESOURCE MANAGEMENT
// ============================================

/**
 * Assign a resource to an organization
 *
 * Creates: (resource:studio-a, owner, org:acme)
 * Meaning: "resource studio-a is owned by org acme"
 */
export const assignResourceToOrg = mutation({
  args: {
    resourceId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, { resourceId, orgId }) => {
    await zanvex.write(
      ctx,
      { type: "resource", id: resourceId },
      "owner",
      { type: "org", id: orgId }
    );
    return { success: true };
  },
});

/**
 * Remove organization's ownership of a resource
 */
export const removeResourceFromOrg = mutation({
  args: {
    resourceId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, { resourceId, orgId }) => {
    const deleted = await zanvex.remove(
      ctx,
      { type: "resource", id: resourceId },
      "owner",
      { type: "org", id: orgId }
    );
    return { deleted };
  },
});

// ============================================
// PERMISSION CHECKS
// ============================================

/**
 * Check if a user can access a resource
 *
 * This performs 1-hop traversal:
 * 1. Direct check: Does (resource:X, owner, user:Y) exist? → usually NO
 * 2. Find memberships: Does (org:?, member_of, user:Y) exist? → returns orgs
 * 3. Check orgs: Does (resource:X, owner, org:?) exist? → if YES, return true
 */
export const canAccessResource = query({
  args: {
    userId: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, { userId, resourceId }) => {
    return await zanvex.check(
      ctx,
      { type: "resource", id: resourceId },
      "owner",
      { type: "user", id: userId }
    );
  },
});

/**
 * Check if a user is a member of an organization
 */
export const isOrgMember = query({
  args: {
    userId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, { userId, orgId }) => {
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
 * List all organizations a user belongs to
 */
export const listUserOrgs = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const relations = await zanvex.listRelations(ctx, {
      type: "user",
      id: userId,
    });
    // Filter to only member_of relations to orgs
    return relations.filter(
      (r) => r.relation === "member_of" && r.objectType === "org"
    );
  },
});

/**
 * List all permissions for a resource
 */
export const listResourcePermissions = query({
  args: {
    resourceId: v.string(),
  },
  handler: async (ctx, { resourceId }) => {
    return await zanvex.listTuplesForObject(ctx, {
      type: "resource",
      id: resourceId,
    });
  },
});

// ============================================
// DEMO SETUP
// ============================================

/**
 * Set up a demo scenario:
 * - Create org "acme-studio"
 * - Add users "alice" and "bob" to the org
 * - Assign resources "studio-a" and "studio-b" to the org
 */
export const setupDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const orgId = "acme-studio";

    // Add users to org
    await zanvex.write(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: "alice" }
    );
    await zanvex.write(
      ctx,
      { type: "org", id: orgId },
      "member_of",
      { type: "user", id: "bob" }
    );

    // Assign resources to org
    await zanvex.write(
      ctx,
      { type: "resource", id: "studio-a" },
      "owner",
      { type: "org", id: orgId }
    );
    await zanvex.write(
      ctx,
      { type: "resource", id: "studio-b" },
      "owner",
      { type: "org", id: orgId }
    );

    return {
      orgId,
      users: ["alice", "bob"],
      resources: ["studio-a", "studio-b"],
    };
  },
});

/**
 * Clean up demo data
 */
export const cleanupDemo = mutation({
  args: {},
  handler: async (ctx) => {
    // Remove all tuples for the demo resources and org
    const resourcesDeleted =
      (await zanvex.removeAllForObject(ctx, {
        type: "resource",
        id: "studio-a",
      })) +
      (await zanvex.removeAllForObject(ctx, {
        type: "resource",
        id: "studio-b",
      }));

    const orgDeleted = await zanvex.removeAllForObject(ctx, {
      type: "org",
      id: "acme-studio",
    });

    return {
      resourcesDeleted,
      orgDeleted,
    };
  },
});

/**
 * Clear ALL data - removes all tuples from the database
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const deleted = await zanvex.clearAll(ctx);
    return { deleted };
  },
});
