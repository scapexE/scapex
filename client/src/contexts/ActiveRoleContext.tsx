import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Role, type SystemUser, getPrimaryRole } from "@/lib/permissions";

interface ActiveRoleContextValue {
  activeRole: Role | null;
  setActiveRole: (role: Role) => void;
  currentUser: SystemUser | null;
  userRoles: Role[];
  isMultiRole: boolean;
}

const ActiveRoleContext = createContext<ActiveRoleContextValue>({
  activeRole: null,
  setActiveRole: () => {},
  currentUser: null,
  userRoles: [],
  isMultiRole: false,
});

export function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const [currentUser] = useState<SystemUser | null>(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const userRoles: Role[] =
    currentUser?.roles && currentUser.roles.length > 0
      ? currentUser.roles
      : currentUser?.role
      ? [currentUser.role]
      : [];

  const defaultRole = userRoles.length > 0 ? getPrimaryRole(userRoles) : null;

  const [activeRole, setActiveRoleState] = useState<Role | null>(() => {
    const stored = sessionStorage.getItem("activeRole") as Role | null;
    if (stored && userRoles.includes(stored)) return stored;
    return defaultRole;
  });

  const setActiveRole = (role: Role) => {
    sessionStorage.setItem("activeRole", role);
    setActiveRoleState(role);
  };

  useEffect(() => {
    if (defaultRole && !activeRole) setActiveRoleState(defaultRole);
  }, [defaultRole]);

  return (
    <ActiveRoleContext.Provider
      value={{
        activeRole,
        setActiveRole,
        currentUser,
        userRoles,
        isMultiRole: userRoles.length > 1,
      }}
    >
      {children}
    </ActiveRoleContext.Provider>
  );
}

export function useActiveRole() {
  return useContext(ActiveRoleContext);
}
