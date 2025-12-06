import { useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
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

const pageMetadata: Record<
  Page,
  { title: string; breadcrumbs: { label: string; href?: string }[] }
> = {
  "app-data": {
    title: "App Data",
    breadcrumbs: [
      { label: "Data", href: "#" },
      { label: "App Data" },
    ],
  },
  tuples: {
    title: "Relationship Tuples",
    breadcrumbs: [
      { label: "Data", href: "#" },
      { label: "Tuples" },
    ],
  },
  "permission-rules": {
    title: "Permission Rules",
    breadcrumbs: [
      { label: "Permissions", href: "#" },
      { label: "Rules" },
    ],
  },
  "permission-tester": {
    title: "Permission Tester",
    breadcrumbs: [
      { label: "Permissions", href: "#" },
      { label: "Tester" },
    ],
  },
  "object-types": {
    title: "Object Types",
    breadcrumbs: [
      { label: "Schema", href: "#" },
      { label: "Object Types" },
    ],
  },
  graph: {
    title: "Graph Visualization",
    breadcrumbs: [
      { label: "Schema", href: "#" },
      { label: "Graph" },
    ],
  },
  settings: {
    title: "Settings",
    breadcrumbs: [{ label: "Settings" }],
  },
};

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

  const metadata = pageMetadata[currentPage];

  return (
    <SelectionProvider>
      <SidebarProvider>
        <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <SidebarInset>
          <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {metadata.breadcrumbs.map((crumb, index) => (
                  <div key={index} className="contents">
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                    <BreadcrumbItem
                      className={index === 0 ? "hidden md:block" : undefined}
                    >
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{renderPage()}</div>
        </SidebarInset>
      </SidebarProvider>
    </SelectionProvider>
  );
}

export default App;
