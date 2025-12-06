import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SelectionProvider } from "@/contexts/selection-context";
import { AppDataPage } from "@/pages/app-data";
import { TuplesPage } from "@/pages/tuples";
import { PermissionRulesPage } from "@/pages/permission-rules";
import { PermissionTesterPage } from "@/pages/permission-tester";
import { ObjectTypesPage } from "@/pages/object-types";
import { GraphPage } from "@/pages/graph";
import { SettingsPage } from "@/pages/settings";

type Page =
  | "app-data"
  | "tuples"
  | "permission-rules"
  | "permission-tester"
  | "object-types"
  | "graph"
  | "settings";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("app-data");

  const renderPage = () => {
    switch (currentPage) {
      case "app-data":
        return <AppDataPage />;
      case "tuples":
        return <TuplesPage />;
      case "permission-rules":
        return <PermissionRulesPage />;
      case "permission-tester":
        return <PermissionTesterPage />;
      case "object-types":
        return <ObjectTypesPage />;
      case "graph":
        return <GraphPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <AppDataPage />;
    }
  };

  return (
    <SelectionProvider>
      <SidebarProvider>
        <AppSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <SidebarInset>
          <div className="flex flex-col flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto py-8 px-4">
              {renderPage()}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SelectionProvider>
  );
}

export default App;
