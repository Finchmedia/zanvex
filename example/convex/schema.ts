import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Test Harness Schema
 *
 * These tables simulate what a real app would have.
 * When we create data here, we ALSO sync to Zanvex tuples.
 * This lets us test the full flow: App Data → Zanvex → Permission Checks
 */
export default defineSchema({
  // Users in our "app"
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }),

  // Organizations
  orgs: defineTable({
    name: v.string(),
    slug: v.string(),
  }),

  // Org membership (join table)
  // This is what a real app would have - we ALSO mirror this to Zanvex
  org_members: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  // Resources owned by orgs
  resources: defineTable({
    name: v.string(),
    orgId: v.id("orgs"),
  }).index("by_org", ["orgId"]),
});
