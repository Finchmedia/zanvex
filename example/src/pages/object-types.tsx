import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Plus, Trash2, RefreshCw, Edit2, Save, X } from "lucide-react";

interface Relation {
  name: string;
  targetType: string;
  description?: string;
}

interface ObjectType {
  name: string;
  description?: string;
  relations: Relation[];
}

export function ObjectTypesPage() {
  const objectTypes = useQuery(api.app.listObjectTypes) ?? [];
  const relationNames = useQuery(api.app.listRelationNames) ?? [];
  const registerObjectType = useMutation(api.app.registerObjectType);
  const deleteObjectType = useMutation(api.app.deleteObjectType);
  const initializeObjectTypes = useMutation(api.app.initializeObjectTypes);

  const [editingType, setEditingType] = useState<ObjectType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [relations, setRelations] = useState<Relation[]>([]);

  // Relation form state
  const [relationName, setRelationName] = useState("");
  const [relationTarget, setRelationTarget] = useState("");
  const [relationDescription, setRelationDescription] = useState("");

  // Initialize on first load
  useEffect(() => {
    if (objectTypes.length === 0) {
      initializeObjectTypes();
    }
  }, [objectTypes.length, initializeObjectTypes]);

  const startEdit = (type: ObjectType) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeDescription(type.description ?? "");
    setRelations([...type.relations]);
  };

  const cancelEdit = () => {
    setEditingType(null);
    setTypeName("");
    setTypeDescription("");
    setRelations([]);
  };

  const handleSave = async () => {
    if (!typeName) return;

    await registerObjectType({
      name: typeName,
      description: typeDescription || undefined,
      relations,
    });

    cancelEdit();
  };

  const handleAddRelation = () => {
    if (!relationName || !relationTarget) return;

    setRelations([
      ...relations,
      {
        name: relationName,
        targetType: relationTarget,
        description: relationDescription || undefined,
      },
    ]);

    setRelationName("");
    setRelationTarget("");
    setRelationDescription("");
  };

  const handleRemoveRelation = (index: number) => {
    setRelations(relations.filter((_, i) => i !== index));
  };

  const handleDelete = async (name: string) => {
    await deleteObjectType({ name });
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Database className="size-5" />
          <h2 className="text-xl font-semibold">Object Types</h2>
          <span className="text-muted-foreground text-sm">
            (Schema registry for permission graph)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Object Types List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Registered Types ({objectTypes.length})
              </CardTitle>
              <CardDescription>
                Click to edit, or create a new type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-auto">
                {objectTypes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      No object types defined
                    </p>
                    <Button size="sm" onClick={() => initializeObjectTypes()}>
                      <RefreshCw className="size-4 mr-2" />
                      Initialize Defaults
                    </Button>
                  </div>
                ) : (
                  objectTypes.map((type) => (
                    <div
                      key={type.name}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        editingType?.name === type.name
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-blue-500">
                              {type.name}
                            </span>
                            {editingType?.name !== type.name && (
                              <Edit2
                                className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                                onClick={() => startEdit(type)}
                              />
                            )}
                          </div>
                          {type.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {type.description}
                            </p>
                          )}
                        </div>
                        <Trash2
                          className="size-4 opacity-50 hover:opacity-100 hover:text-destructive cursor-pointer shrink-0"
                          onClick={() => handleDelete(type.name)}
                        />
                      </div>
                      {type.relations.length > 0 && (
                        <div className="space-y-1 pl-3 border-l-2 border-border">
                          {type.relations.map((rel, i) => (
                            <div
                              key={i}
                              className="text-xs font-mono flex items-center gap-2"
                            >
                              <span className="text-yellow-500">{rel.name}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-500">
                                {rel.targetType}
                              </span>
                              {rel.description && (
                                <span className="text-muted-foreground italic">
                                  ({rel.description})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingType ? `Edit: ${editingType.name}` : "Create New Type"}
              </CardTitle>
              <CardDescription>
                Define object type and its valid relations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Name & Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type Name</label>
                <Input
                  placeholder="e.g., resource, booking, user"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  disabled={!!editingType}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Optional description"
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                />
              </div>

              {/* Relations */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Relations</label>
                <div className="space-y-2">
                  {relations.map((rel, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-secondary rounded text-sm font-mono"
                    >
                      <span className="text-yellow-500">{rel.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-500 flex-1">
                        {rel.targetType}
                      </span>
                      <Trash2
                        className="size-4 opacity-50 hover:opacity-100 hover:text-destructive cursor-pointer"
                        onClick={() => handleRemoveRelation(i)}
                      />
                    </div>
                  ))}
                </div>

                {/* Add Relation Form */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Add Relation:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={relationName} onValueChange={setRelationName}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select relation..." />
                      </SelectTrigger>
                      <SelectContent>
                        {relationNames.map((rel) => (
                          <SelectItem key={rel.name} value={rel.name}>
                            <div className="flex flex-col items-start">
                              <span>{rel.label}</span>
                              {rel.description && (
                                <span className="text-xs text-muted-foreground">
                                  {rel.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={relationTarget} onValueChange={setRelationTarget}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select target type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {objectTypes.map((type) => (
                          <SelectItem key={type.name} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Description (optional)"
                    value={relationDescription}
                    onChange={(e) => setRelationDescription(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleAddRelation}
                    disabled={!relationName || !relationTarget}
                  >
                    <Plus className="size-4 mr-1" />
                    Add Relation
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!typeName}
                >
                  <Save className="size-4 mr-1" />
                  Save Type
                </Button>
                {editingType && (
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="size-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Examples */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Example Schema</CardTitle>
            <CardDescription>
              Typical object types for a booking system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="font-semibold text-blue-500">user</div>
                <div className="text-muted-foreground pl-3">
                  (no relations - leaf node)
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-blue-500">org</div>
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">admin_of</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-500">user</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">member_of</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-500">user</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-blue-500">resource</div>
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">owner</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-500">org</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-blue-500">booking</div>
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">parent</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-500">resource</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">booker</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-500">user</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
