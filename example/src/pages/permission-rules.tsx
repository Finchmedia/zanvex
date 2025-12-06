import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, RefreshCw, Trash2, Plus, Save, X } from "lucide-react";

export function PermissionRulesPage() {
  // Queries
  const permissionRules = useQuery(api.app.listPermissionRules) ?? [];
  const objectTypes = useQuery(api.app.listObjectTypes) ?? [];

  // Mutations
  const initializePermissionRules = useMutation(
    api.app.initializePermissionRules
  );
  const definePermissionRule = useMutation(api.app.definePermissionRule);
  const deletePermissionRule = useMutation(api.app.deletePermissionRule);

  // Form state
  const [objectType, setObjectType] = useState("");
  const [permission, setPermission] = useState("");
  const [expression, setExpression] = useState("");

  // Initialize permission rules on first load
  useEffect(() => {
    if (permissionRules.length === 0) {
      initializePermissionRules();
    }
  }, [permissionRules.length, initializePermissionRules]);

  const handleDefineRule = async () => {
    if (!objectType || !permission || !expression) return;

    await definePermissionRule({ objectType, permission, expression });
    setObjectType("");
    setPermission("");
    setExpression("");
  };

  // Group rules by object type
  const rulesByType = permissionRules.reduce(
    (acc, rule) => {
      if (!acc[rule.objectType]) {
        acc[rule.objectType] = [];
      }
      acc[rule.objectType].push(rule);
      return acc;
    },
    {} as Record<string, typeof permissionRules>
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="size-5" />
          <h2 className="text-xl font-semibold">Permission Rules</h2>
          <span className="text-muted-foreground text-sm">
            (Zanzibar-style DSL expressions)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rules List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Defined Rules ({permissionRules.length})
              </CardTitle>
              <CardDescription>
                Rules grouped by object type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-auto">
                {permissionRules.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      No permission rules defined
                    </p>
                    <Button
                      size="sm"
                      onClick={() => initializePermissionRules()}
                    >
                      <RefreshCw className="size-4 mr-2" />
                      Initialize Defaults
                    </Button>
                  </div>
                ) : (
                  Object.entries(rulesByType).map(([type, rules]) => (
                    <div key={type} className="space-y-2">
                      <div className="text-sm font-semibold text-blue-500 font-mono">
                        {type}
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-border">
                        {rules.map((rule) => (
                          <div
                            key={`${rule.objectType}-${rule.permission}`}
                            className="flex items-center gap-2 p-2 bg-secondary rounded-lg font-mono text-xs"
                          >
                            <span className="text-yellow-500">
                              {rule.permission}
                            </span>
                            <span className="text-muted-foreground">=</span>
                            <span className="text-green-500 flex-1">
                              {rule.expression}
                            </span>
                            <Trash2
                              className="size-4 opacity-50 hover:opacity-100 hover:text-destructive cursor-pointer shrink-0"
                              onClick={() =>
                                deletePermissionRule({
                                  objectType: rule.objectType,
                                  permission: rule.permission,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create New Rule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Define New Rule</CardTitle>
              <CardDescription>
                Create a permission rule using DSL syntax
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Object Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Object Type</label>
                {objectTypes.length > 0 ? (
                  <select
                    className="w-full px-3 py-2 rounded-md bg-secondary border border-input text-sm"
                    value={objectType}
                    onChange={(e) => setObjectType(e.target.value)}
                  >
                    <option value="">Select object type...</option>
                    {objectTypes.map((type) => (
                      <option key={type.name} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="e.g., resource, booking"
                    value={objectType}
                    onChange={(e) => setObjectType(e.target.value)}
                  />
                )}
              </div>

              {/* Permission Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Permission</label>
                <Input
                  placeholder="e.g., view, edit, delete, cancel"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                />
              </div>

              {/* DSL Expression */}
              <div className="space-y-2">
                <label className="text-sm font-medium">DSL Expression</label>
                <Input
                  placeholder="e.g., owner->admin_of | booker"
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Preview */}
              {objectType && permission && expression && (
                <div className="p-3 bg-secondary rounded-lg font-mono text-sm">
                  <span className="text-blue-500">{objectType}</span>
                  <span className="text-muted-foreground">.</span>
                  <span className="text-yellow-500">{permission}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="text-green-500">{expression}</span>
                </div>
              )}

              {/* Save Button */}
              <Button
                className="w-full"
                onClick={handleDefineRule}
                disabled={!objectType || !permission || !expression}
              >
                <Save className="size-4 mr-1" />
                Define Rule
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* DSL Syntax Reference */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">DSL Syntax Reference</CardTitle>
            <CardDescription>
              How to write permission expressions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-mono text-green-500 mb-1">booker</div>
                <p className="text-muted-foreground">
                  <strong>Direct relation check:</strong> Subject must have the
                  "booker" relation to the object
                </p>
              </div>

              <div>
                <div className="font-mono text-green-500 mb-1">
                  owner-&gt;admin_of
                </div>
                <p className="text-muted-foreground">
                  <strong>Computed permission:</strong> Follow the "owner"
                  relation, then check if subject has "admin_of" on that target
                </p>
              </div>

              <div>
                <div className="font-mono text-green-500 mb-1">
                  parent-&gt;edit | booker
                </div>
                <p className="text-muted-foreground">
                  <strong>OR logic:</strong> Either path grants access - subject
                  can have edit permission on parent, OR be the booker
                </p>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Example rules for a booking system:</strong>
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-blue-500">resource</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-yellow-500">view</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-green-500">
                      owner-&gt;admin_of | owner-&gt;member_of
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-500">resource</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-yellow-500">edit</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-green-500">owner-&gt;admin_of</span>
                  </div>
                  <div>
                    <span className="text-blue-500">booking</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-yellow-500">cancel</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-green-500">
                      parent-&gt;edit | booker
                    </span>
                  </div>
                </div>
              </div>

              {/* Show available object types if any */}
              {objectTypes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Registered object types in your schema:</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {objectTypes.map((type) => (
                      <div
                        key={type.name}
                        className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded text-xs font-mono"
                      >
                        {type.name}
                        {type.relations.length > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({type.relations.map((r) => r.name).join(", ")})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
