import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Check, X, Plus, Trash2, Users, Building2, Box } from "lucide-react";

function PermissionDemo() {
  // Entity creation inputs
  const [newUserId, setNewUserId] = useState("");
  const [newOrgId, setNewOrgId] = useState("");
  const [newResourceId, setNewResourceId] = useState("");

  // Relationship creation inputs
  const [relUserId, setRelUserId] = useState("");
  const [relOrgId, setRelOrgId] = useState("");
  const [relResourceId, setRelResourceId] = useState("");

  // Permission check inputs
  const [checkUserId, setCheckUserId] = useState("");
  const [checkOrgId, setCheckOrgId] = useState("");
  const [checkResourceId, setCheckResourceId] = useState("");

  // Local state to track created entities (for display purposes)
  const [users, setUsers] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);

  // Queries - only run when we have values to check
  const canAccess = useQuery(
    api.example.canAccessResource,
    checkUserId && checkResourceId ? { userId: checkUserId, resourceId: checkResourceId } : "skip"
  );
  const isMember = useQuery(
    api.example.isOrgMember,
    checkUserId && checkOrgId ? { userId: checkUserId, orgId: checkOrgId } : "skip"
  );
  const orgMembers = useQuery(
    api.example.listOrgMembers,
    checkOrgId ? { orgId: checkOrgId } : "skip"
  );
  const resourcePermissions = useQuery(
    api.example.listResourcePermissions,
    checkResourceId ? { resourceId: checkResourceId } : "skip"
  );

  // Mutations
  const addUserToOrg = useMutation(api.example.addUserToOrg);
  const removeUserFromOrg = useMutation(api.example.removeUserFromOrg);
  const assignResourceToOrg = useMutation(api.example.assignResourceToOrg);
  const removeResourceFromOrg = useMutation(api.example.removeResourceFromOrg);
  const clearAllData = useMutation(api.example.clearAllData);

  // Helper to add entity to local list
  const addUser = () => {
    if (newUserId && !users.includes(newUserId)) {
      setUsers([...users, newUserId]);
      setNewUserId("");
    }
  };

  const addOrg = () => {
    if (newOrgId && !orgs.includes(newOrgId)) {
      setOrgs([...orgs, newOrgId]);
      setNewOrgId("");
    }
  };

  const addResource = () => {
    if (newResourceId && !resources.includes(newResourceId)) {
      setResources([...resources, newResourceId]);
      setNewResourceId("");
    }
  };

  const handleAddUserToOrg = async () => {
    if (relUserId && relOrgId) {
      await addUserToOrg({ userId: relUserId, orgId: relOrgId });
      // Auto-add to local lists if not present
      if (!users.includes(relUserId)) setUsers([...users, relUserId]);
      if (!orgs.includes(relOrgId)) setOrgs([...orgs, relOrgId]);
    }
  };

  const handleRemoveUserFromOrg = async () => {
    if (relUserId && relOrgId) {
      await removeUserFromOrg({ userId: relUserId, orgId: relOrgId });
    }
  };

  const handleAssignResourceToOrg = async () => {
    if (relResourceId && relOrgId) {
      await assignResourceToOrg({ resourceId: relResourceId, orgId: relOrgId });
      // Auto-add to local lists if not present
      if (!resources.includes(relResourceId)) setResources([...resources, relResourceId]);
      if (!orgs.includes(relOrgId)) setOrgs([...orgs, relOrgId]);
    }
  };

  const handleRemoveResourceFromOrg = async () => {
    if (relResourceId && relOrgId) {
      await removeResourceFromOrg({ resourceId: relResourceId, orgId: relOrgId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Entity Creation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="user id..."
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUser()}
              />
              <Button size="icon" onClick={addUser} disabled={!newUserId}>
                <Plus className="size-4" />
              </Button>
            </div>
            {users.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {users.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-md cursor-pointer hover:bg-secondary/80"
                    onClick={() => {
                      setRelUserId(u);
                      setCheckUserId(u);
                    }}
                  >
                    {u}
                    <X
                      className="size-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUsers(users.filter((x) => x !== u));
                      }}
                    />
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="org id..."
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addOrg()}
              />
              <Button size="icon" onClick={addOrg} disabled={!newOrgId}>
                <Plus className="size-4" />
              </Button>
            </div>
            {orgs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {orgs.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-md cursor-pointer hover:bg-secondary/80"
                    onClick={() => {
                      setRelOrgId(o);
                      setCheckOrgId(o);
                    }}
                  >
                    {o}
                    <X
                      className="size-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrgs(orgs.filter((x) => x !== o));
                      }}
                    />
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Box className="size-4" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="resource id..."
                value={newResourceId}
                onChange={(e) => setNewResourceId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addResource()}
              />
              <Button size="icon" onClick={addResource} disabled={!newResourceId}>
                <Plus className="size-4" />
              </Button>
            </div>
            {resources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {resources.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-md cursor-pointer hover:bg-secondary/80"
                    onClick={() => {
                      setRelResourceId(r);
                      setCheckResourceId(r);
                    }}
                  >
                    {r}
                    <X
                      className="size-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResources(resources.filter((x) => x !== r));
                      }}
                    />
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Relationship Management */}
      <Card>
        <CardHeader>
          <CardTitle>Create Relationships</CardTitle>
          <CardDescription>
            Add users to orgs, assign resources to orgs. Click entity chips above to auto-fill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User to Org */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">User</label>
              <Input
                className="w-32"
                placeholder="user..."
                value={relUserId}
                onChange={(e) => setRelUserId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Org</label>
              <Input
                className="w-32"
                placeholder="org..."
                value={relOrgId}
                onChange={(e) => setRelOrgId(e.target.value)}
              />
            </div>
            <Button onClick={handleAddUserToOrg} disabled={!relUserId || !relOrgId} size="sm">
              <Plus className="size-4 mr-1" />
              Add User to Org
            </Button>
            <Button onClick={handleRemoveUserFromOrg} disabled={!relUserId || !relOrgId} variant="destructive" size="sm">
              <Trash2 className="size-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Resource to Org */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Resource</label>
              <Input
                className="w-32"
                placeholder="resource..."
                value={relResourceId}
                onChange={(e) => setRelResourceId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Org</label>
              <Input
                className="w-32"
                placeholder="org..."
                value={relOrgId}
                onChange={(e) => setRelOrgId(e.target.value)}
              />
            </div>
            <Button onClick={handleAssignResourceToOrg} disabled={!relResourceId || !relOrgId} size="sm">
              <Plus className="size-4 mr-1" />
              Assign Resource to Org
            </Button>
            <Button onClick={handleRemoveResourceFromOrg} disabled={!relResourceId || !relOrgId} variant="destructive" size="sm">
              <Trash2 className="size-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Checks</CardTitle>
          <CardDescription>
            Test permission checks. Click entity chips above to auto-fill.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">User</label>
              <Input
                placeholder="user..."
                value={checkUserId}
                onChange={(e) => setCheckUserId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Org</label>
              <Input
                placeholder="org..."
                value={checkOrgId}
                onChange={(e) => setCheckOrgId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Resource</label>
              <Input
                placeholder="resource..."
                value={checkResourceId}
                onChange={(e) => setCheckResourceId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Can Access Resource */}
            <div className={`p-4 rounded-lg border ${
              canAccess === undefined ? "border-border" :
              canAccess ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {canAccess === undefined ? null : canAccess ? (
                  <Check className="size-5 text-green-500" />
                ) : (
                  <X className="size-5 text-destructive" />
                )}
                <span className="font-medium">Can Access Resource?</span>
              </div>
              {checkUserId && checkResourceId ? (
                <>
                  <code className="text-xs text-muted-foreground block mb-2">
                    check(resource:{checkResourceId}, owner, user:{checkUserId})
                  </code>
                  <p className={`text-xl font-bold ${
                    canAccess === undefined ? "text-muted-foreground" :
                    canAccess ? "text-green-500" : "text-destructive"
                  }`}>
                    {canAccess === undefined ? "Loading..." : canAccess ? "YES" : "NO"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter user & resource to check</p>
              )}
            </div>

            {/* Is Org Member */}
            <div className={`p-4 rounded-lg border ${
              isMember === undefined ? "border-border" :
              isMember ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isMember === undefined ? null : isMember ? (
                  <Check className="size-5 text-green-500" />
                ) : (
                  <X className="size-5 text-destructive" />
                )}
                <span className="font-medium">Is Org Member?</span>
              </div>
              {checkUserId && checkOrgId ? (
                <>
                  <code className="text-xs text-muted-foreground block mb-2">
                    check(org:{checkOrgId}, member_of, user:{checkUserId})
                  </code>
                  <p className={`text-xl font-bold ${
                    isMember === undefined ? "text-muted-foreground" :
                    isMember ? "text-green-500" : "text-destructive"
                  }`}>
                    {isMember === undefined ? "Loading..." : isMember ? "YES" : "NO"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter user & org to check</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Introspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Org Members {checkOrgId && <span className="text-muted-foreground font-normal">({checkOrgId})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!checkOrgId ? (
              <p className="text-sm text-muted-foreground">Enter an org above to see members</p>
            ) : orgMembers === undefined ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : orgMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No members</p>
            ) : (
              <ul className="space-y-1">
                {orgMembers.map((m, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Users className="size-3 text-muted-foreground" />
                    {m.subjectType}:{m.subjectId}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resource Permissions {checkResourceId && <span className="text-muted-foreground font-normal">({checkResourceId})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!checkResourceId ? (
              <p className="text-sm text-muted-foreground">Enter a resource above to see permissions</p>
            ) : resourcePermissions === undefined ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : resourcePermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No permissions</p>
            ) : (
              <ul className="space-y-1">
                {resourcePermissions.map((p, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <Box className="size-3 text-muted-foreground" />
                    {p.relation}: {p.subjectType}:{p.subjectId}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How 1-Hop Traversal Works</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
{`check(resource:X, owner, user:Y)

Step 1: Direct check
  → (resource:X, owner, user:Y) exists? NO

Step 2: Find Y's memberships
  → (org:?, member_of, user:Y) exists? → returns org IDs

Step 3: Check if any org has access
  → (resource:X, owner, org:?) exists? → if YES, return true

Result: TRUE if user is member of an org that owns the resource`}
          </pre>
        </CardContent>
      </Card>

      {/* Cleanup */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearAllData();
            setUsers([]);
            setOrgs([]);
            setResources([]);
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
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Zanvex</h1>
            <p className="text-muted-foreground">
              Zanzibar-inspired ReBAC for Convex
            </p>
          </div>
          <ThemeToggle />
        </div>
        <PermissionDemo />
      </div>
    </div>
  );
}

export default App;
