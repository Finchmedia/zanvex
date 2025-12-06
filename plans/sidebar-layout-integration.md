# Zanvex Example App: Sidebar Layout Integration

## Overview

Integrate the shadcn sidebar-02 template into the Zanvex example app to organize the growing UI into navigable sections.

**Reference:** `/Users/danielfinke/Documents/STARTUPS/JUMPER/convexcal/sidebar-02/`

---

## Current State

### Example App Structure

```
example/src/
├── App.tsx              # 900+ line monolithic component
├── main.tsx             # Entry point with providers
├── index.css            # Tailwind styles
├── components/
│   ├── theme-toggle.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
└── lib/
    └── utils.ts
```

### Current App.tsx Sections

The monolithic `App.tsx` contains these logical sections:

1. **App Data** - Users, Orgs, Resources, Bookings CRUD
2. **Org Membership** - Add/remove users to orgs
3. **Relationship Tuples** - View stored tuples
4. **Permission Checks** - Test can() results
5. **Permission Rules** - View/manage DSL rules

---

## Target State

### New Structure

```
example/src/
├── App.tsx                    # Now just the layout shell
├── main.tsx                   # Entry point (unchanged)
├── index.css                  # Tailwind styles
├── components/
│   ├── app-sidebar.tsx        # NEW: Sidebar navigation
│   ├── logo-switcher.tsx      # NEW: Zanvex branding in header
│   ├── theme-toggle.tsx       # Existing
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── sidebar.tsx        # NEW: shadcn sidebar primitives
│       ├── separator.tsx      # NEW: shadcn separator
│       ├── breadcrumb.tsx     # NEW: shadcn breadcrumb
│       ├── collapsible.tsx    # NEW: shadcn collapsible
│       └── dropdown-menu.tsx  # NEW: shadcn dropdown
├── pages/
│   ├── app-data.tsx           # Users, Orgs, Resources, Bookings
│   ├── tuples.tsx             # Relationship tuples view
│   ├── permission-rules.tsx   # Permission rules CRUD
│   ├── permission-tester.tsx  # Test can() queries
│   ├── object-types.tsx       # NEW (future): Object types schema
│   └── graph.tsx              # NEW (future): React Flow graph
└── lib/
    └── utils.ts
```

---

## Navigation Structure

### Sidebar Navigation

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │ 🔐 Zanvex                       │    │
│  │    Example App                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ▼ Data                                 │
│      App Data                           │
│      Relationship Tuples                │
│                                         │
│  ▼ Permissions                          │
│      Permission Rules                   │
│      Permission Tester                  │
│                                         │
│  ▼ Schema (future)                      │
│      Object Types                       │
│      Graph View                         │
│                                         │
│  ─────────────────────────────────────  │
│  ⚙️ Settings                            │
│      Theme                              │
│      Clear All Data                     │
└─────────────────────────────────────────┘
```

### Page Mapping

| Sidebar Item | Page Component | Current Location in App.tsx |
|--------------|----------------|----------------------------|
| App Data | `pages/app-data.tsx` | Section 1: Users, Orgs, Resources, Bookings + Org Membership |
| Relationship Tuples | `pages/tuples.tsx` | Section 3: All tuples display |
| Permission Rules | `pages/permission-rules.tsx` | Section 5: Rules list + add/delete |
| Permission Tester | `pages/permission-tester.tsx` | Section 4: Resource/Booking permission checks |
| Object Types | `pages/object-types.tsx` | Future: object-types-schema-registry.md |
| Graph View | `pages/graph.tsx` | Future: graph-visualization.md |

---

## Implementation Plan

### Phase 1: Install Required shadcn Components

```bash
cd example
npx shadcn@latest add sidebar
npx shadcn@latest add separator
npx shadcn@latest add breadcrumb
npx shadcn@latest add collapsible
npx shadcn@latest add dropdown-menu
```

**Note:** The example app uses Vite + React (not Next.js), so we adapt the template accordingly.

### Phase 2: Create Sidebar Components

#### `components/app-sidebar.tsx`

Adapted from sidebar-02, with Zanvex-specific navigation:

```tsx
import * as React from "react";
import {
  Database,
  GitBranch,
  Shield,
  TestTube,
  Boxes,
  Network,
  Settings,
  ChevronRight
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

const navData = {
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
        { title: "Object Types", icon: Boxes, page: "object-types", disabled: true },
        { title: "Graph View", icon: Network, page: "graph", disabled: true },
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
            title={section.title}
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
            <SidebarMenuButton onClick={() => onPageChange("settings")}>
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
```

#### `components/logo-switcher.tsx`

Zanvex branding (replaces VersionSwitcher):

```tsx
import { Shield } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function LogoSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="cursor-default">
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Shield className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold">Zanvex</span>
            <span className="text-xs text-muted-foreground">Example App</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

### Phase 3: Create Page Components

Extract sections from `App.tsx` into individual page components.

#### `pages/app-data.tsx`

```tsx
// Contains: Users, Orgs, Resources, Bookings cards
// Contains: Org Membership section
// All the state and mutations for CRUD operations

export function AppDataPage() {
  // ... extracted from App.tsx lines ~35-450
}
```

#### `pages/tuples.tsx`

```tsx
// Contains: Relationship Tuples display
// Read-only view of all stored tuples

export function TuplesPage() {
  // ... extracted from App.tsx
}
```

#### `pages/permission-rules.tsx`

```tsx
// Contains: Permission Rules CRUD
// DSL expression input
// Initialize/delete rules

export function PermissionRulesPage() {
  // ... extracted from App.tsx
}
```

#### `pages/permission-tester.tsx`

```tsx
// Contains: Resource Permissions card
// Contains: Booking Permissions card
// Contains: Recursive Traversal Path visualization

export function PermissionTesterPage() {
  // ... extracted from App.tsx
}
```

#### `pages/settings.tsx`

```tsx
// Contains: Theme toggle
// Contains: Clear All Data button

export function SettingsPage() {
  // ... new component
}
```

### Phase 4: Refactor App.tsx

New `App.tsx` becomes a thin layout shell:

```tsx
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

// Pages
import { AppDataPage } from "@/pages/app-data";
import { TuplesPage } from "@/pages/tuples";
import { PermissionRulesPage } from "@/pages/permission-rules";
import { PermissionTesterPage } from "@/pages/permission-tester";
import { SettingsPage } from "@/pages/settings";

const pageConfig: Record<string, { title: string; component: React.FC }> = {
  "app-data": { title: "App Data", component: AppDataPage },
  "tuples": { title: "Relationship Tuples", component: TuplesPage },
  "permission-rules": { title: "Permission Rules", component: PermissionRulesPage },
  "permission-tester": { title: "Permission Tester", component: PermissionTesterPage },
  "settings": { title: "Settings", component: SettingsPage },
};

export default function App() {
  const [currentPage, setCurrentPage] = useState("app-data");

  const { title, component: PageComponent } = pageConfig[currentPage] ?? pageConfig["app-data"];

  return (
    <SidebarProvider>
      <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-6">
          <PageComponent />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## Shared State Considerations

Some state is shared across pages:

| State | Used By | Solution |
|-------|---------|----------|
| `selectedUserId` | App Data, Permission Tester | Lift to App.tsx or use Context |
| `selectedOrgId` | App Data, Permission Tester | Lift to App.tsx or use Context |
| `selectedResourceId` | App Data, Permission Tester | Lift to App.tsx or use Context |
| `selectedBookingId` | App Data, Permission Tester | Lift to App.tsx or use Context |

### Recommended: Selection Context

```tsx
// contexts/selection-context.tsx
interface SelectionContextType {
  selectedUserId: Id<"users"> | null;
  setSelectedUserId: (id: Id<"users"> | null) => void;
  selectedOrgId: Id<"orgs"> | null;
  setSelectedOrgId: (id: Id<"orgs"> | null) => void;
  selectedResourceId: Id<"resources"> | null;
  setSelectedResourceId: (id: Id<"resources"> | null) => void;
  selectedBookingId: Id<"bookings"> | null;
  setSelectedBookingId: (id: Id<"bookings"> | null) => void;
}

export const SelectionContext = createContext<SelectionContextType>(...);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  // ... other state

  return (
    <SelectionContext.Provider value={{ ... }}>
      {children}
    </SelectionContext.Provider>
  );
}
```

Wrap in `main.tsx`:

```tsx
<ConvexProvider>
  <SelectionProvider>
    <App />
  </SelectionProvider>
</ConvexProvider>
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `components/ui/sidebar.tsx` | ADD via shadcn |
| `components/ui/separator.tsx` | ADD via shadcn |
| `components/ui/breadcrumb.tsx` | ADD via shadcn |
| `components/ui/collapsible.tsx` | ADD via shadcn |
| `components/ui/dropdown-menu.tsx` | ADD via shadcn |
| `components/app-sidebar.tsx` | CREATE - main navigation |
| `components/logo-switcher.tsx` | CREATE - branding header |
| `pages/app-data.tsx` | CREATE - extracted from App.tsx |
| `pages/tuples.tsx` | CREATE - extracted from App.tsx |
| `pages/permission-rules.tsx` | CREATE - extracted from App.tsx |
| `pages/permission-tester.tsx` | CREATE - extracted from App.tsx |
| `pages/settings.tsx` | CREATE - theme + clear data |
| `contexts/selection-context.tsx` | CREATE - shared selection state |
| `App.tsx` | REWRITE - layout shell only |
| `main.tsx` | MODIFY - add SelectionProvider |

---

## Implementation Order

1. **Install shadcn components** (sidebar, separator, breadcrumb, collapsible, dropdown-menu)
2. **Create `components/ui/sidebar.tsx`** - copy from shadcn output
3. **Create `components/logo-switcher.tsx`** - simple branding
4. **Create `components/app-sidebar.tsx`** - navigation structure
5. **Create `contexts/selection-context.tsx`** - shared state
6. **Update `main.tsx`** - wrap with SelectionProvider
7. **Create page components** one by one:
   - `pages/app-data.tsx` (largest, extract first)
   - `pages/tuples.tsx`
   - `pages/permission-rules.tsx`
   - `pages/permission-tester.tsx`
   - `pages/settings.tsx`
8. **Rewrite `App.tsx`** - layout shell with routing
9. **Test each page** works independently
10. **Add future pages** (object-types, graph) as stubs

---

## Visual Result

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│                  │  ☰  App Data                                           │
│  🔐 Zanvex       ├────────────────────────────────────────────────────────┤
│     Example App  │                                                        │
│                  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  ▼ Data          │  │ Users   │ │ Orgs    │ │Resources│ │Bookings │       │
│    • App Data    │  │         │ │         │ │         │ │         │       │
│      Tuples      │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                  │                                                        │
│  ▼ Permissions   │  ┌─────────────────────────────────────────────────┐   │
│      Rules       │  │ Org Membership                                  │   │
│      Tester      │  │ ...                                             │   │
│                  │  └─────────────────────────────────────────────────┘   │
│  ▼ Schema        │                                                        │
│      Types  Soon │                                                        │
│      Graph  Soon │                                                        │
│                  │                                                        │
│  ────────────────│                                                        │
│  ⚙️ Settings     │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] Sidebar navigation works (click to switch pages)
- [ ] All existing functionality preserved
- [ ] Sidebar collapses/expands correctly
- [ ] Theme toggle moved to Settings page
- [ ] Selection state persists across page navigation
- [ ] Future pages (Object Types, Graph) show as disabled "Soon"
- [ ] Mobile responsive (sidebar as drawer)

---

## Related Plans

- `object-types-schema-registry.md` → Object Types page
- `react-permission-manager.md` → Enhanced Permission Rules page
- `graph-visualization.md` → Graph View page
