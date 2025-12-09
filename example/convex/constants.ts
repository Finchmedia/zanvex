/**
 * Zanvex Example App - Schema Constants
 *
 * Single source of truth for all schema definitions.
 * Used by both seed.ts and app.ts initialization functions.
 */

/**
 * Permission definitions for the permission catalog
 */
export const PERMISSIONS = [
  { name: "create", label: "Create", description: "Create new instances", category: "crud" as const },
  { name: "read", label: "Read", description: "View/read instances", category: "crud" as const },
  { name: "update", label: "Update", description: "Modify existing instances", category: "crud" as const },
  { name: "delete", label: "Delete", description: "Remove instances", category: "crud" as const },
] as const;

/**
 * Relation name definitions for the relation catalog
 */
export const RELATION_NAMES = [
  // Structural relations
  { name: "parent", label: "parent", description: "Parent/container relation" },
  { name: "owner", label: "owner", description: "Ownership relation" },
  { name: "child", label: "child", description: "Child/contained relation" },

  // Membership relations
  { name: "member_of", label: "member_of", description: "Membership relation" },
  { name: "admin_of", label: "admin_of", description: "Admin/manager relation" },

  // Assignment relations
  { name: "booker", label: "booker", description: "Who made the booking" },
  { name: "assignee", label: "assignee", description: "Who is assigned/responsible" },
  { name: "creator", label: "creator", description: "Who created this instance" },

  // Permission-based relations
  { name: "viewer", label: "viewer", description: "Who can view" },
  { name: "editor", label: "editor", description: "Who can edit" },
  { name: "collaborator", label: "collaborator", description: "Who can collaborate" },
] as const;

/**
 * Object type definitions for the object type registry
 */
export const OBJECT_TYPES: {
  name: string;
  description: string;
  relations: { name: string; targetType: string; description: string }[];
}[] = [
  {
    name: "user",
    description: "A user of the system",
    relations: [],
  },
  {
    name: "org",
    description: "An organization",
    relations: [
      { name: "admin_of", targetType: "user", description: "User is an admin of this org" },
      { name: "member_of", targetType: "user", description: "User is a member of this org" },
    ],
  },
  {
    name: "resource",
    description: "A bookable resource like a studio",
    relations: [
      { name: "owner", targetType: "org", description: "The org that owns this resource" },
    ],
  },
  {
    name: "booking",
    description: "A booking for a resource",
    relations: [
      { name: "parent", targetType: "resource", description: "The resource being booked" },
      { name: "booker", targetType: "user", description: "The user who made the booking" },
    ],
  },
];
