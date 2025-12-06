import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Shield, Calendar, ArrowRight } from "lucide-react";
import { useSelection } from "@/contexts/selection-context";

export function PermissionTesterPage() {
  const {
    selectedUserId,
    selectedOrgId,
    selectedResourceId,
    selectedBookingId,
  } = useSelection();

  // Queries - App Data (for display)
  const users = useQuery(api.app.listUsers) ?? [];
  const resources = useQuery(api.app.listResources) ?? [];
  const bookings = useQuery(api.app.listBookings) ?? [];

  // Queries - Resource Permissions
  const resourcePermissions = useQuery(
    api.app.getResourcePermissions,
    selectedUserId && selectedResourceId
      ? { userId: selectedUserId, resourceId: selectedResourceId }
      : "skip"
  );

  // Queries - Booking Permissions
  const bookingPermissions = useQuery(
    api.app.getBookingPermissions,
    selectedUserId && selectedBookingId
      ? { userId: selectedUserId, bookingId: selectedBookingId }
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

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-5" />
          <h2 className="text-xl font-semibold">Permission Checks</h2>
          <span className="text-muted-foreground text-sm">
            (Zanzibar-style recursive traversal)
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
                      resourcePermissions?.[
                        action as keyof typeof resourcePermissions
                      ];
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

        {/* Booking Permissions Card */}
        {selectedUserId && selectedBookingId && (
          <Card className="mt-4 border-2 border-yellow-500">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4" />
                Booking Permissions
                {bookingPermissions?.relation && (
                  <span className="text-xs font-normal bg-yellow-500/20 px-2 py-0.5 rounded">
                    via {bookingPermissions.relation}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                What can{" "}
                {users.find((u) => u._id === selectedUserId)?.name ?? "user"} do
                with{" "}
                {bookings.find((b) => b._id === selectedBookingId)?.title ??
                  "booking"}
                ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {(["create", "read", "update", "delete", "cancel"] as const).map(
                  (action) => {
                    const allowed =
                      bookingPermissions?.[
                        action as keyof typeof bookingPermissions
                      ];
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
              <CardTitle className="text-base">
                Recursive Traversal Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm font-mono flex-wrap">
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
                {selectedBookingId && (
                  <>
                    <ArrowRight className="size-4" />
                    <span className="text-muted-foreground">parent?</span>
                    <ArrowRight className="size-4" />
                    <span className="px-2 py-1 bg-purple-500/20 rounded">
                      booking:
                      {bookings.find((b) => b._id === selectedBookingId)?.title}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Rules like{" "}
                <code className="bg-muted px-1 rounded">
                  booking.cancel = "parent-&gt;edit | booker"
                </code>{" "}
                enable multi-hop traversal
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
