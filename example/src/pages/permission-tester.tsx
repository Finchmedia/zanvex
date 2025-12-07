import { useState } from "react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Shield } from "lucide-react";
import { TraversalGraph } from "@/components/traversal-graph";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";

export function PermissionTesterPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [objectRef, setObjectRef] = useState<string | null>(null); // Format: "resource:id" or "booking:id"

  // Queries - App Data
  const users = useQuery(api.app.listUsers) ?? [];
  const resources = useQuery(api.app.listResources) ?? [];
  const bookings = useQuery(api.app.listBookings) ?? [];
  const permissions = useQuery(api.app.listPermissions) ?? [];

  // Parse objectRef to extract type and ID
  const parsedObject = objectRef
    ? (() => {
        const [type, ...idParts] = objectRef.split(":");
        const id = idParts.join(":"); // Handle IDs with colons
        return { type, id };
      })()
    : null;

  // Query - Permission Check with Path
  const checkResult = useQuery(
    api.app.canWithPath,
    userId && action && parsedObject
      ? {
          userId,
          action,
          objectType: parsedObject.type,
          objectId: parsedObject.id,
        }
      : "skip"
  );

  // Query - All Permissions for Object
  const allPermissions = useQuery(
    api.app.getResourcePermissions,
    userId && parsedObject && parsedObject.type === "resource"
      ? {
          userId,
          resourceId: parsedObject.id as Id<"resources">,
        }
      : "skip"
  );

  const bookingPermissions = useQuery(
    api.app.getBookingPermissions,
    userId && parsedObject && parsedObject.type === "booking"
      ? {
          userId,
          bookingId: parsedObject.id as Id<"bookings">,
        }
      : "skip"
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5" />
          <h2 className="text-xl font-semibold">Permission Tester</h2>
          <span className="text-muted-foreground text-sm">
            (Interactive permission checker with graph visualization)
          </span>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Permission</CardTitle>
            <CardDescription>
              Select a user, action, and object to check permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* User Dropdown */}
              <div>
                <label className="text-xs font-medium mb-2 block">User</label>
                <Select
                  value={userId ?? undefined}
                  onValueChange={(val) => setUserId(val as Id<"users">)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      users.map((u) => (
                        <SelectItem key={u._id} value={u._id}>
                          {u.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Dropdown */}
              <div>
                <label className="text-xs font-medium mb-2 block">Action</label>
                <Select value={action ?? undefined} onValueChange={setAction}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No permissions available
                      </SelectItem>
                    ) : (
                      <>
                        <SelectGroup>
                          <SelectLabel>CRUD Operations</SelectLabel>
                          {permissions
                            .filter((p) => p.category === "crud")
                            .map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.label}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Common Actions</SelectLabel>
                          {permissions
                            .filter((p) => p.category === "action")
                            .map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.label}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Object Dropdown */}
              <div>
                <label className="text-xs font-medium mb-2 block">Object</label>
                <Select value={objectRef ?? undefined} onValueChange={setObjectRef}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select object..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.length === 0 && bookings.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No objects available
                      </SelectItem>
                    ) : (
                      <>
                        {resources.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Resources</SelectLabel>
                            {resources.map((r) => (
                              <SelectItem
                                key={r._id}
                                value={`resource:${r._id}`}
                              >
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {bookings.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Bookings</SelectLabel>
                            {bookings.map((b) => (
                              <SelectItem
                                key={b._id}
                                value={`booking:${b._id}`}
                              >
                                {b.title}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {checkResult && (
          <Card
            className={cn(
              "border-2",
              checkResult.allowed ? "border-green-500" : "border-destructive"
            )}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                {checkResult.allowed ? (
                  <CheckCircle2 className="size-8 text-green-500" />
                ) : (
                  <XCircle className="size-8 text-destructive" />
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {checkResult.allowed ? "ALLOWED" : "DENIED"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {checkResult.reason}
                  </p>
                </div>
              </div>
              {checkResult.matchedRule && (
                <p className="text-sm">
                  <span className="font-medium">Matched rule:</span>{" "}
                  <code className="bg-secondary px-2 py-1 rounded text-xs">
                    {checkResult.matchedRule}
                  </code>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Traversal Graph */}
        {checkResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permission Check Path</CardTitle>
              <CardDescription>
                Visualizes how the permission check traversed the object graph
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TraversalGraph data={checkResult} />
            </CardContent>
          </Card>
        )}

        {/* All Permissions Panel */}
        {userId && parsedObject && (allPermissions || bookingPermissions) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                All Permissions on This Object
              </CardTitle>
              <CardDescription>
                Shows all permissions{" "}
                {users.find((u) => u._id === userId)?.name ?? "user"} has on
                this{" "}
                {parsedObject.type === "resource"
                  ? resources.find((r) => r._id === parsedObject.id)?.name
                  : bookings.find((b) => b._id === parsedObject.id)?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {parsedObject.type === "resource" &&
                  allPermissions &&
                  (["create", "read", "update", "delete"] as const).map(
                    (perm) => {
                      const allowed = allPermissions[perm];
                      return (
                        <div
                          key={perm}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium border",
                            allowed
                              ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400"
                              : "bg-muted border-border text-muted-foreground"
                          )}
                        >
                          {perm}
                        </div>
                      );
                    }
                  )}
                {parsedObject.type === "booking" &&
                  bookingPermissions &&
                  (["create", "read", "update", "delete", "cancel"] as const).map(
                    (perm) => {
                      const allowed = bookingPermissions[perm];
                      return (
                        <div
                          key={perm}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium border",
                            allowed
                              ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400"
                              : "bg-muted border-border text-muted-foreground"
                          )}
                        >
                          {perm}
                        </div>
                      );
                    }
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!userId && !action && !objectRef && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Select a user, action, and object to test permissions
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
