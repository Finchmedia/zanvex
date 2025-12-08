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
import { Button } from "@/components/ui/button";
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
  const orgs = useQuery(api.app.listOrgs) ?? [];
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
  const orgPermissions = useQuery(
    api.app.getOrgPermissions,
    userId && parsedObject && parsedObject.type === "org"
      ? {
          userId,
          orgId: parsedObject.id as Id<"orgs">,
        }
      : "skip"
  );

  const resourcePermissions = useQuery(
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
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5" />
          <h2 className="text-xl font-semibold">Permission Tester</h2>
        </div>

        {/* Step 1: Select User */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1: Select User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users available</p>
              ) : (
                users.map((u) => (
                  <Button
                    key={u._id}
                    variant={userId === u._id ? "default" : "outline"}
                    onClick={() => setUserId(u._id)}
                  >
                    {u.name}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2: Select Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions available</p>
              ) : (
                permissions.map((p) => (
                  <Button
                    key={p.name}
                    variant={action === p.name ? "default" : "outline"}
                    onClick={() => setAction(p.name)}
                  >
                    {p.label}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Select Object */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3: Select Object</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgs.length === 0 && resources.length === 0 && bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No objects available</p>
              ) : (
                <>
                  {orgs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Organizations ({orgs.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {orgs.map((o) => (
                          <Button
                            key={o._id}
                            variant={objectRef === `org:${o._id}` ? "default" : "outline"}
                            onClick={() => setObjectRef(`org:${o._id}`)}
                          >
                            {o.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {resources.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Resources ({resources.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {resources.map((r) => (
                          <Button
                            key={r._id}
                            variant={objectRef === `resource:${r._id}` ? "default" : "outline"}
                            onClick={() => setObjectRef(`resource:${r._id}`)}
                          >
                            {r.name}
                            <span className="ml-1 text-xs text-muted-foreground">
                              @{orgs.find((o) => o._id === r.orgId)?.name}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {bookings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Bookings ({bookings.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {bookings.map((b) => (
                          <Button
                            key={b._id}
                            variant={objectRef === `booking:${b._id}` ? "default" : "outline"}
                            onClick={() => setObjectRef(`booking:${b._id}`)}
                          >
                            {b.title}
                            <span className="ml-1 text-xs text-muted-foreground">
                              @{resources.find((r) => r._id === b.resourceId)?.name}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
        {userId && parsedObject && (orgPermissions || resourcePermissions || bookingPermissions) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                All Permissions on This Object
              </CardTitle>
              <CardDescription>
                Shows all permissions{" "}
                {users.find((u) => u._id === userId)?.name ?? "user"} has on
                this{" "}
                {parsedObject.type === "org"
                  ? orgs.find((o) => o._id === parsedObject.id)?.name
                  : parsedObject.type === "resource"
                  ? resources.find((r) => r._id === parsedObject.id)?.name
                  : bookings.find((b) => b._id === parsedObject.id)?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {parsedObject.type === "org" &&
                  orgPermissions &&
                  (["create", "read", "update", "delete"] as const).map(
                    (perm) => {
                      const allowed = orgPermissions[perm];
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
                {parsedObject.type === "resource" &&
                  resourcePermissions &&
                  (["create", "read", "update", "delete"] as const).map(
                    (perm) => {
                      const allowed = resourcePermissions[perm];
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
                  (["create", "read", "update", "delete"] as const).map(
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
