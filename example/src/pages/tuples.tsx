import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitBranch } from "lucide-react";

export function TuplesPage() {
  // Queries - Zanvex Tuples
  const allTuples = useQuery(api.app.getAllTuples) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="size-5" />
          <h2 className="text-xl font-semibold">Relationship Tuples</h2>
          <span className="text-muted-foreground text-sm">
            (Zanvex permission graph)
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              All Tuples ({allTuples.length})
            </CardTitle>
            <CardDescription>Live view of permission graph</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-auto font-mono text-xs">
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
      </section>
    </div>
  );
}
