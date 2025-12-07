import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronRight } from "lucide-react";

interface RuleCondition {
  id: string; // unique ID for React keys
  type: "direct" | "computed";
  relation?: string; // For direct: the relation to check
  sourceRelation?: string; // For computed: follow this relation
  targetPermission?: string; // For computed: check this permission on target
}

interface ObjectType {
  name: string;
  description?: string;
  relations: Array<{
    name: string;
    targetType: string;
    description?: string;
  }>;
}

interface Permission {
  name: string;
  label: string;
  description?: string;
  category: string;
}

interface RuleBuilderProps {
  objectType: string; // The object type we're defining a rule for
  objectTypes: ObjectType[]; // All registered types (for validation)
  permissions: Permission[]; // All available permissions
  onRuleChange: (dslExpression: string) => void; // Callback with DSL string
}

export function RuleBuilder({
  objectType,
  objectTypes,
  permissions,
  onRuleChange,
}: RuleBuilderProps) {
  const [conditions, setConditions] = useState<RuleCondition[]>([]);

  // Current object type's available relations
  const currentTypeRelations =
    objectTypes.find((t) => t.name === objectType)?.relations ?? [];

  // When conditions change, convert to DSL and notify parent
  useEffect(() => {
    const dsl = conditionsToDSL(conditions);
    onRuleChange(dsl);
  }, [conditions, onRuleChange]);

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `condition-${Date.now()}`,
        type: "direct",
      },
    ]);
  };

  const updateCondition = (index: number, updated: RuleCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updated;
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Who can perform this action?</div>

      {conditions.map((condition, index) => (
        <ConditionRow
          key={condition.id}
          condition={condition}
          index={index}
          relations={currentTypeRelations}
          permissions={permissions}
          objectTypes={objectTypes}
          onUpdate={(updated) => updateCondition(index, updated)}
          onRemove={() => removeCondition(index)}
        />
      ))}

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="size-4 mr-2" />
        Add Condition (OR)
      </Button>

      {/* DSL Preview */}
      {conditions.length > 0 && (
        <div className="p-3 bg-secondary rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            Generated DSL:
          </div>
          <div className="font-mono text-sm text-green-500">
            {conditionsToDSL(conditions) || '(empty)'}
          </div>
        </div>
      )}
    </div>
  );
}

interface ConditionRowProps {
  condition: RuleCondition;
  index: number;
  relations: Array<{
    name: string;
    targetType: string;
    description?: string;
  }>;
  permissions: Permission[];
  objectTypes: ObjectType[];
  onUpdate: (updated: RuleCondition) => void;
  onRemove: () => void;
}

function ConditionRow({
  condition,
  index,
  relations,
  permissions,
  objectTypes,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  // Get target type for the selected source relation
  const selectedRelation = relations.find(
    (r) => r.name === condition.sourceRelation
  );
  const targetType = selectedRelation?.targetType;

  // Get permissions for the target type (if computed)
  const targetObjectType = objectTypes.find((t) => t.name === targetType);

  return (
    <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
      {index > 0 && (
        <div className="text-xs text-muted-foreground font-semibold mr-2">
          OR
        </div>
      )}

      {/* Type selector: Direct vs Computed */}
      <Select
        value={condition.type}
        onValueChange={(value) =>
          onUpdate({
            ...condition,
            type: value as "direct" | "computed",
            // Reset relation-specific fields when switching types
            relation: undefined,
            sourceRelation: undefined,
            targetPermission: undefined,
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="direct">Direct Relation</SelectItem>
          <SelectItem value="computed">Inherited Permission</SelectItem>
        </SelectContent>
      </Select>

      {condition.type === "direct" ? (
        // Direct relation: just select which relation
        <Select
          value={condition.relation || ""}
          onValueChange={(value) => onUpdate({ ...condition, relation: value })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select relation..." />
          </SelectTrigger>
          <SelectContent>
            {relations.map((rel) => (
              <SelectItem key={rel.name} value={rel.name}>
                <div className="flex items-center gap-2">
                  <span>{rel.name}</span>
                  <span className="text-xs text-muted-foreground">
                    → {rel.targetType}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        // Computed: follow relation + check permission
        <>
          <Select
            value={condition.sourceRelation || ""}
            onValueChange={(value) =>
              onUpdate({ ...condition, sourceRelation: value })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Follow relation..." />
            </SelectTrigger>
            <SelectContent>
              {relations.map((rel) => (
                <SelectItem key={rel.name} value={rel.name}>
                  <div className="flex items-center gap-2">
                    <span>{rel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      → {rel.targetType}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChevronRight className="size-4 text-muted-foreground shrink-0" />

          <Select
            value={condition.targetPermission || ""}
            onValueChange={(value) =>
              onUpdate({ ...condition, targetPermission: value })
            }
            disabled={!condition.sourceRelation}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Check permission..." />
            </SelectTrigger>
            <SelectContent>
              {permissions.map((perm) => (
                <SelectItem key={perm.name} value={perm.name}>
                  {perm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <Trash2
        className="size-4 opacity-50 hover:opacity-100 hover:text-destructive cursor-pointer shrink-0"
        onClick={onRemove}
      />
    </div>
  );
}

/**
 * Convert conditions to DSL string
 */
function conditionsToDSL(conditions: RuleCondition[]): string {
  return conditions
    .map((c) => {
      if (c.type === "direct") {
        return c.relation;
      } else {
        if (c.sourceRelation && c.targetPermission) {
          return `${c.sourceRelation}->${c.targetPermission}`;
        }
        return undefined;
      }
    })
    .filter(Boolean)
    .join(" | ");
}
