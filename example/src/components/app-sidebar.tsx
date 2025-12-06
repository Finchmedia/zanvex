import * as React from "react";
import {
  Database,
  GitBranch,
  Shield,
  TestTube,
  Boxes,
  Network,
  Settings,
  ChevronRight,
} from "lucide-react";

import { LogoSwitcher } from "@/components/logo-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  icon: LucideIcon;
  page: string;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navData: { sections: NavSection[] } = {
  sections: [
    {
      title: "Data",
      items: [
        { title: "App Data", icon: Database, page: "app-data" },
        { title: "Relationship Tuples", icon: GitBranch, page: "tuples" },
      ],
    },
    {
      title: "Permissions",
      items: [
        { title: "Permission Rules", icon: Shield, page: "permission-rules" },
        { title: "Permission Tester", icon: TestTube, page: "permission-tester" },
      ],
    },
    {
      title: "Schema",
      items: [
        { title: "Object Types", icon: Boxes, page: "object-types" },
        { title: "Graph View", icon: Network, page: "graph" },
      ],
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function AppSidebar({ currentPage, onPageChange, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <LogoSwitcher />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {navData.sections.map((section) => (
          <Collapsible
            key={section.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
              >
                <CollapsibleTrigger>
                  {section.title}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={currentPage === item.page}
                          disabled={item.disabled}
                          onClick={() => !item.disabled && onPageChange(item.page)}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          {item.disabled && (
                            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentPage === "settings"}
              onClick={() => onPageChange("settings")}
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
