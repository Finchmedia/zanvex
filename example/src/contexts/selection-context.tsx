import { createContext, useContext, useState, type ReactNode } from "react";
import type { Id } from "@convex/_generated/dataModel";

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

const SelectionContext = createContext<SelectionContextType | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"orgs"> | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<Id<"resources"> | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"bookings"> | null>(null);

  return (
    <SelectionContext.Provider
      value={{
        selectedUserId,
        setSelectedUserId,
        selectedOrgId,
        setSelectedOrgId,
        selectedResourceId,
        setSelectedResourceId,
        selectedBookingId,
        setSelectedBookingId,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
