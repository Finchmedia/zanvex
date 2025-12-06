import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSelection } from "@/contexts/selection-context";

export function SettingsPage() {
  const {
    setSelectedUserId,
    setSelectedOrgId,
    setSelectedResourceId,
    setSelectedBookingId,
  } = useSelection();

  const clearAll = useMutation(api.app.clearAll);

  const handleClearAll = async () => {
    await clearAll();
    setSelectedUserId(null);
    setSelectedOrgId(null);
    setSelectedResourceId(null);
    setSelectedBookingId(null);
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="size-5" />
          <h2 className="text-xl font-semibold">Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>
                Toggle between light and dark mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clear All Data</CardTitle>
              <CardDescription>
                Remove all app data, Zanvex tuples, rules, and object types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleClearAll}>
                <Trash2 className="size-4 mr-2" />
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
