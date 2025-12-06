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
  Plus,
  Trash2,
  Users,
  Building2,
  Box,
  ArrowRight,
  Database,
  GitBranch,
  Calendar,
  Ban,
} from "lucide-react";
import { useSelection } from "@/contexts/selection-context";

export function AppDataPage() {
  const {
    selectedUserId,
    setSelectedUserId,
    selectedOrgId,
    setSelectedOrgId,
    selectedResourceId,
    setSelectedResourceId,
    selectedBookingId,
    setSelectedBookingId,
  } = useSelection();

  // Form inputs
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [bookingTitle, setBookingTitle] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("admin");

  // Queries - App Data
  const users = useQuery(api.app.listUsers) ?? [];
  const orgs = useQuery(api.app.listOrgs) ?? [];
  const resources = useQuery(api.app.listResources) ?? [];
  const bookings = useQuery(api.app.listBookings) ?? [];
  const orgMembers = useQuery(
    api.app.listOrgMembers,
    selectedOrgId ? { orgId: selectedOrgId } : "skip"
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
  const createBooking = useMutation(api.app.createBooking);
  const deleteBooking = useMutation(api.app.deleteBooking);
  const cancelBooking = useMutation(api.app.cancelBooking);

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

  const handleCreateBooking = async () => {
    if (bookingTitle && selectedResourceId && selectedUserId) {
      await createBooking({
        title: bookingTitle,
        resourceId: selectedResourceId,
        bookerId: selectedUserId,
        start: new Date().toISOString(),
      });
      setBookingTitle("");
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Bookings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="size-4" />
                Bookings ({bookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Booking title"
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateBooking()}
                />
                <div className="text-xs text-muted-foreground">
                  {selectedResourceId && selectedUserId
                    ? `${users.find((u) => u._id === selectedUserId)?.name} books ${resources.find((r) => r._id === selectedResourceId)?.name}`
                    : "Select user & resource first"}
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleCreateBooking}
                  disabled={!bookingTitle || !selectedResourceId || !selectedUserId}
                >
                  <Plus className="size-4 mr-1" /> Create Booking
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {bookings.map((b) => (
                  <div
                    key={b._id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                      selectedBookingId === b._id
                        ? "bg-primary text-primary-foreground"
                        : b.status === "cancelled"
                          ? "bg-destructive/20"
                          : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() =>
                      setSelectedBookingId(
                        selectedBookingId === b._id ? null : b._id
                      )
                    }
                  >
                    <div className="truncate">
                      <span className="font-medium">{b.title}</span>
                      <span className="text-xs opacity-70 ml-2">
                        @{b.resourceName}
                      </span>
                      {b.status === "cancelled" && (
                        <span className="text-xs ml-1 text-destructive">(cancelled)</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {b.status !== "cancelled" && (
                        <Ban
                          className="size-4 opacity-50 hover:opacity-100 hover:text-yellow-500 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelBooking({ bookingId: b._id });
                          }}
                        />
                      )}
                      <Trash2
                        className="size-4 opacity-50 hover:opacity-100 hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBooking({ bookingId: b._id });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2: Org Membership */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="size-5" />
          <h2 className="text-xl font-semibold">Org Membership</h2>
          <span className="text-muted-foreground text-sm">
            (synced to Zanvex tuples)
          </span>
        </div>

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
      </section>
    </div>
  );
}
