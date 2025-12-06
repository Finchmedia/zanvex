/**
 * Permission DSL Parser
 *
 * Parses permission expressions in Zanzibar-style DSL syntax.
 *
 * Syntax:
 *   - "booker"              → Direct relation check
 *   - "owner->admin_of"     → Computed: follow 'owner' relation, check 'admin_of' permission
 *   - "parent->edit | booker" → OR logic between multiple rules
 *
 * Examples:
 *   parsePermissionExpression("booker")
 *   → [{ type: "direct", relation: "booker" }]
 *
 *   parsePermissionExpression("owner->admin_of")
 *   → [{ type: "computed", sourceRelation: "owner", targetPermission: "admin_of" }]
 *
 *   parsePermissionExpression("parent->edit | booker")
 *   → [
 *       { type: "computed", sourceRelation: "parent", targetPermission: "edit" },
 *       { type: "direct", relation: "booker" }
 *     ]
 */

/**
 * A parsed permission rule - either direct relation or computed via traversal
 */
export type PermissionRule =
  | { type: "direct"; relation: string }
  | { type: "computed"; sourceRelation: string; targetPermission: string };

/**
 * Parse a permission expression DSL string into structured rules
 *
 * @param expression - DSL expression like "parent->edit | booker"
 * @returns Array of parsed rules (OR logic between them)
 * @throws Error if expression is invalid
 */
export function parsePermissionExpression(expression: string): PermissionRule[] {
  if (!expression || expression.trim().length === 0) {
    throw new Error("Permission expression cannot be empty");
  }

  const parts = expression.split("|").map((part) => part.trim());
  const rules: PermissionRule[] = [];

  for (const part of parts) {
    if (part.length === 0) {
      throw new Error(`Invalid permission expression: empty part in "${expression}"`);
    }

    if (part.includes("->")) {
      // Computed permission: "owner->admin_of"
      const segments = part.split("->");
      if (segments.length !== 2) {
        throw new Error(
          `Invalid computed permission: "${part}" (expected "relation->permission")`
        );
      }

      const [sourceRelation, targetPermission] = segments.map((s) => s.trim());

      if (!sourceRelation || !targetPermission) {
        throw new Error(
          `Invalid computed permission: "${part}" (missing relation or permission)`
        );
      }

      // Validate no special characters (basic sanity check)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sourceRelation)) {
        throw new Error(`Invalid relation name: "${sourceRelation}"`);
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(targetPermission)) {
        throw new Error(`Invalid permission name: "${targetPermission}"`);
      }

      rules.push({
        type: "computed",
        sourceRelation,
        targetPermission,
      });
    } else {
      // Direct relation: "booker"
      const relation = part.trim();

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(relation)) {
        throw new Error(`Invalid relation name: "${relation}"`);
      }

      rules.push({
        type: "direct",
        relation,
      });
    }
  }

  return rules;
}

/**
 * Convert parsed rules back to DSL string (for display)
 */
export function rulesToExpression(rules: PermissionRule[]): string {
  return rules
    .map((rule) => {
      if (rule.type === "direct") {
        return rule.relation;
      } else {
        return `${rule.sourceRelation}->${rule.targetPermission}`;
      }
    })
    .join(" | ");
}
