import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Check,
  X,
  Plus,
  Trash2,
  Users,
  Building2,
  Box,
  ArrowRight,
  Database,
  GitBranch,
  Shield,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Id } from "../convex/_generated/dataModel";
import { useEffect } from "react";

function TestHarness() {
  // Form inputs
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [resourceName, setResourceName] = useState("");

  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(
    null
  );
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"orgs"> | null>(null);
  const [selectedResourceId, setSelectedResourceId] =
    useState<Id<"resources"> | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("admin");

  // Queries - App Data
  const users = useQuery(api.app.listUsers) ?? [];
  const orgs = useQuery(api.app.listOrgs) ?? [];
  const resources = useQuery(api.app.listResources) ?? [];
  const orgMembers = useQuery(
    api.app.listOrgMembers,
    selectedOrgId ? { orgId: selectedOrgId } : "skip"
  );

  // Queries - Zanvex Tuples
  const allTuples = useQuery(api.app.getAllTuples) ?? [];

  // Queries - Permission Schema
  const permissionSchemas = useQuery(api.app.listPermissionSchemas) ?? [];

  // Queries - Resource Permissions (NEW!)
  const resourcePermissions = useQuery(
    api.app.getResourcePermissions,
    selectedUserId && selectedResourceId
      ? { userId: selectedUserId, resourceId: selectedResourceId }
      : "skip"
  );

  // Queries - Permission Checks (legacy)
  const canManageResource = useQuery(
    api.app.canUserManageResource,
    selectedUserId && selectedResourceId
      ? { userId: selectedUserId, resourceId: selectedResourceId }
      : "skip"
  );
  const isOrgAdmin = useQuery(
    api.app.isUserOrgAdmin,
    selectedUserId && selectedOrgId
      ? { userId: selectedUserId, orgId: selectedOrgId }
      : "skip"
  );
  const isOrgMember = useQuery(
    api.app.isUserOrgMember,
    selectedUserId && selectedOrgId
      ? { userId: selectedUserId, orgId: selectedOrgId }
      : "skip"
  );

  // Mutations
  const createUser = useMutation(api.app.createUser);
  const deleteUser = useMutation(api.app.deleteUser);
  const createOrg = useMutation(api.app.createOrg);
  const deleteOrg = useMutation(api.app.deleteOrg);
  const createResource = useMutation(api.app.createResource);
  const deleteResource = useMutation(api.app.deleteResource);
  const addUserToOrg = useMutation(api.app.addUserToOrg);
  const removeUserFromOrg = useMutation(api.app.removeUserFromOrg);
  const clearAll = useMutation(api.app.clearAll);
  const initializePermissions = useMutation(api.app.initializePermissions);
  const updatePermissionSchema = useMutation(api.app.updatePermissionSchema);

  // Initialize permissions on first load
  useEffect(() => {
    if (permissionSchemas.length === 0) {
      initializePermissions();
    }
  }, [permissionSchemas.length, initializePermissions]);

  // Handlers
  const handleCreateUser = async () => {
    if (userName && userEmail) {
      await createUser({ name: userName, email: userEmail });
      setUserName("");
      setUserEmail("");
    }
  };

  const handleCreateOrg = async () => {
    if (orgName && orgSlug) {
      await createOrg({ name: orgName, slug: orgSlug });
      setOrgName("");
      setOrgSlug("");
    }
  };

  const handleCreateResource = async () => {
    if (resourceName && selectedOrgId) {
      await createResource({ name: resourceName, orgId: selectedOrgId });
      setResourceName("");
    }
  };

  const handleAddUserToOrg = async () => {
    if (selectedUserId && selectedOrgId) {
      try {
        await addUserToOrg({
          userId: selectedUserId,
          orgId: selectedOrgId,
          role: selectedRole,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRemoveUserFromOrg = async () => {
    if (selectedUserId && selectedOrgId) {
      try {
        await removeUserFromOrg({
          userId: selectedUserId,
          orgId: selectedOrgId,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Create App Data */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Database className="size-5" />
          <h2 className="text-xl font-semibold">App Data</h2>
          <span className="text-muted-foreground text-sm">
            (stored in Convex tables)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                />
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleCreateUser}
                  disabled={!userName || !userEmail}
                >
                  <Plus className="size-4 mr-1" /> Create User
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {users.map((u) => (
                  <div
                    key={u._id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                      selectedUserId === u._id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() =>
                      setSelectedUserId(
                        selectedUserId === u._id ? null : u._id
                      )
                    }
                  >
                    <div className="truncate">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs opacity-70 ml-2">{u.email}</span>
                    </div>
                    <Trash2
                      className="size-4 opacity-50 hover:opacity-100 hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUser({ userId: u._id });
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Orgs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" />
                Organizations ({orgs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Input
                  placeholder="Slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                />
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleCreateOrg}
                  disabled={!orgName || !orgSlug}
                >
                  <Plus className="size-4 mr-1" /> Create Org
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {orgs.map((o) => (
                  <div
                    key={o._id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                      selectedOrgId === o._id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() =>
                      setSelectedOrgId(selectedOrgId === o._id ? null : o._id)
                    }
                  >
                    <div className="truncate">
                      <span className="font-medium">{o.name}</span>
                      <span className="text-xs opacity-70 ml-2">/{o.slug}</span>
                    </div>
                    <Trash2
                      className="size-4 opacity-50 hover:opacity-100 hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrg({ orgId: o._id });
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Box className="size-4" />
                Resources ({resources.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateResource()}
                />
                <div className="text-xs text-muted-foreground">
                  {selectedOrgId
                    ? `Will be owned by: ${orgs.find((o) => o._id === selectedOrgId)?.name}`
                    : "Select an org first"}
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleCreateResource}
                  disabled={!resourceName || !selectedOrgId}
                >
                  <Plus className="size-4 mr-1" /> Create Resource
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {resources.map((r) => (
                  <div
                    key={r._id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                      selectedResourceId === r._id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() =>
                      setSelectedResourceId(
                        selectedResourceId === r._id ? null : r._id
                      )
                    }
                  >
                    <div className="truncate">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs opacity-70 ml-2">
                        @{r.orgName}
                      </span>
                    </div>
                    <Trash2
                      className="size-4 opacity-50 hover:opacity-100 hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteResource({ resourceId: r._id });
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2: Relationship Management */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="size-5" />
          <h2 className="text-xl font-semibold">Relationships</h2>
          <span className="text-muted-foreground text-sm">
            (synced to Zanvex tuples)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add User to Org */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add User to Org</CardTitle>
              <CardDescription>
                Creates membership AND Zanvex tuple
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-1 rounded ${selectedUserId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {selectedUserId
                    ? users.find((u) => u._id === selectedUserId)?.name ??
                      "User"
                    : "Select user"}
                </span>
                <ArrowRight className="size-4" />
                <select
                  className="px-2 py-1 rounded bg-secondary border-0 text-sm"
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as "admin" | "member")
                  }
                >
                  <option value="admin">admin_of</option>
                  <option value="member">member_of</option>
                </select>
                <ArrowRight className="size-4" />
                <span
                  className={`px-2 py-1 rounded ${selectedOrgId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {selectedOrgId
                    ? orgs.find((o) => o._id === selectedOrgId)?.name ?? "Org"
                    : "Select org"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={handleAddUserToOrg}
                  disabled={!selectedUserId || !selectedOrgId}
                >
                  <Plus className="size-4 mr-1" /> Add
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveUserFromOrg}
                  disabled={!selectedUserId || !selectedOrgId}
                >
                  <Trash2 className="size-4 mr-1" /> Remove
                </Button>
              </div>

              {/* Show org members */}
              {selectedOrgId && orgMembers && orgMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">
                    Current members:
                  </div>
                  <div className="space-y-1">
                    {orgMembers.map((m) => (
                      <div
                        key={m._id}
                        className="text-xs flex items-center gap-2"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded ${m.role === "admin" ? "bg-yellow-500/20 text-yellow-600" : "bg-blue-500/20 text-blue-600"}`}
                        >
                          {m.role}
                        </span>
                        <span>{m.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zanvex Tuples View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Zanvex Tuples ({allTuples.length})
              </CardTitle>
              <CardDescription>Live view of permission graph</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-48 overflow-auto font-mono text-xs">
                {allTuples.length === 0 ? (
                  <p className="text-muted-foreground italic">No tuples yet</p>
                ) : (
                  allTuples.map((t, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-blue-500">{t.object}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-yellow-500">{t.relation}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-500">{t.subject}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: Permission Checks */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5" />
          <h2 className="text-xl font-semibold">Permission Checks</h2>
          <span className="text-muted-foreground text-sm">
            (Zanvex with 1-hop traversal)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Is Org Admin */}
          <Card
            className={`border-2 ${
              isOrgAdmin === undefined
                ? "border-border"
                : isOrgAdmin
                  ? "border-green-500"
                  : "border-destructive"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {isOrgAdmin !== undefined &&
                  (isOrgAdmin ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  ))}
                Is Org Admin?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUserId && selectedOrgId ? (
                <>
                  <code className="text-xs text-muted-foreground block mb-2">
                    check(org, admin_of, user)
                  </code>
                  <p
                    className={`text-2xl font-bold ${isOrgAdmin ? "text-green-500" : "text-destructive"}`}
                  >
                    {isOrgAdmin === undefined
                      ? "..."
                      : isOrgAdmin
                        ? "YES"
                        : "NO"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select user & org
                </p>
              )}
            </CardContent>
          </Card>

          {/* Is Org Member */}
          <Card
            className={`border-2 ${
              isOrgMember === undefined
                ? "border-border"
                : isOrgMember
                  ? "border-green-500"
                  : "border-destructive"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {isOrgMember !== undefined &&
                  (isOrgMember ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  ))}
                Is Org Member?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUserId && selectedOrgId ? (
                <>
                  <code className="text-xs text-muted-foreground block mb-2">
                    admin_of OR member_of
                  </code>
                  <p
                    className={`text-2xl font-bold ${isOrgMember ? "text-green-500" : "text-destructive"}`}
                  >
                    {isOrgMember === undefined
                      ? "..."
                      : isOrgMember
                        ? "YES"
                        : "NO"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select user & org
                </p>
              )}
            </CardContent>
          </Card>

          {/* Can Manage Resource */}
          <Card
            className={`border-2 ${
              canManageResource === undefined
                ? "border-border"
                : canManageResource
                  ? "border-green-500"
                  : "border-destructive"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {canManageResource !== undefined &&
                  (canManageResource ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  ))}
                Can Manage Resource?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUserId && selectedResourceId ? (
                <>
                  <code className="text-xs text-muted-foreground block mb-2">
                    user → org → resource
                  </code>
                  <p
                    className={`text-2xl font-bold ${canManageResource ? "text-green-500" : "text-destructive"}`}
                  >
                    {canManageResource === undefined
                      ? "..."
                      : canManageResource
                        ? "YES"
                        : "NO"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select user & resource
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resource Permissions Card - THE NEW MAGIC! */}
        {selectedUserId && selectedResourceId && (
          <Card className="mt-4 border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Resource Permissions
                {resourcePermissions?.relation && (
                  <span className="text-xs font-normal bg-primary/20 px-2 py-0.5 rounded">
                    via {resourcePermissions.relation}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                What can{" "}
                {users.find((u) => u._id === selectedUserId)?.name ?? "user"} do
                with{" "}
                {resources.find((r) => r._id === selectedResourceId)?.name ??
                  "resource"}
                ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {(["create", "read", "update", "delete"] as const).map(
                  (action) => {
                    const allowed =
                      resourcePermissions?.[action as keyof typeof resourcePermissions];
                    return (
                      <div
                        key={action}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 ${
                          allowed
                            ? "border-green-500 bg-green-500/10"
                            : "border-destructive/50 bg-destructive/5"
                        }`}
                      >
                        {allowed ? (
                          <Check className="size-6 text-green-500 mb-1" />
                        ) : (
                          <X className="size-6 text-destructive mb-1" />
                        )}
                        <span className="text-sm font-medium capitalize">
                          {action}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Traversal Explanation */}
        {selectedUserId && selectedResourceId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">1-Hop Traversal Path</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="px-2 py-1 bg-green-500/20 rounded">
                  user:{users.find((u) => u._id === selectedUserId)?.name}
                </span>
                <ArrowRight className="size-4" />
                <span className="text-muted-foreground">
                  admin_of/member_of?
                </span>
                <ArrowRight className="size-4" />
                <span className="px-2 py-1 bg-yellow-500/20 rounded">
                  org:?
                </span>
                <ArrowRight className="size-4" />
                <span className="text-muted-foreground">owner?</span>
                <ArrowRight className="size-4" />
                <span className="px-2 py-1 bg-blue-500/20 rounded">
                  resource:
                  {resources.find((r) => r._id === selectedResourceId)?.name}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section 4: Permission Schema Editor */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="size-5" />
          <h2 className="text-xl font-semibold">Permission Schema</h2>
          <span className="text-muted-foreground text-sm">
            (Define what each relation can do)
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relation → Actions</CardTitle>
            <CardDescription>
              Click actions to toggle. Changes are saved immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissionSchemas.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">
                    No permission schema defined
                  </p>
                  <Button size="sm" onClick={() => initializePermissions()}>
                    <RefreshCw className="size-4 mr-2" />
                    Initialize Defaults
                  </Button>
                </div>
              ) : (
                permissionSchemas.map((schema) => (
                  <div
                    key={`${schema.relation}-${schema.objectType}`}
                    className="flex items-center gap-4 p-3 bg-secondary rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <span className="font-mono font-medium text-sm">
                        {schema.relation}
                      </span>
                      <span className="text-xs text-muted-foreground">on</span>
                      <span className="text-xs px-1.5 py-0.5 bg-primary/20 rounded">
                        {schema.objectType}
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <div className="flex gap-2 flex-wrap">
                      {(["create", "read", "update", "delete", "cancel"] as const).map(
                        (action) => {
                          const isEnabled = schema.actions.includes(action);
                          return (
                            <button
                              key={action}
                              onClick={() => {
                                const newActions = isEnabled
                                  ? schema.actions.filter((a) => a !== action)
                                  : [...schema.actions, action];
                                updatePermissionSchema({
                                  relation: schema.relation,
                                  objectType: schema.objectType,
                                  actions: newActions,
                                });
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                isEnabled
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {action}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Clear All */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearAll();
            setSelectedUserId(null);
            setSelectedOrgId(null);
            setSelectedResourceId(null);
          }}
        >
          <Trash2 className="size-4 mr-2" />
          Clear All Data
        </Button>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Zanvex Test Harness
            </h1>
            <p className="text-muted-foreground">
              App Data + Zanvex Tuples side-by-side
            </p>
          </div>
          <ThemeToggle />
        </div>
        <TestHarness />
      </div>
    </div>
  );
}

export default App;
