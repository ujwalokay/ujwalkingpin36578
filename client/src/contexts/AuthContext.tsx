import { createContext, useContext, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  role: "admin" | "staff";
  onboardingCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isStaff: boolean;
  canMakeChanges: boolean;
  deviceRestricted: boolean;
  onboardingCompleted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, user }: { children: ReactNode; user: User | null }) {
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  
  const isStaffOrAdmin = user?.role === "admin" || user?.role === "staff";
  const canMakeChanges = isStaffOrAdmin ? true : true;
  const deviceRestricted = false;
  const onboardingCompleted = user?.onboardingCompleted ?? true;

  return (
    <AuthContext.Provider value={{ user, isAdmin, isStaff, canMakeChanges, deviceRestricted, onboardingCompleted }}>
      {children}
    </AuthContext.Provider>
  );
}

// Mock user for demo mode - provides admin access to all features
const DEMO_USER: User = {
  id: "demo-user",
  username: "Demo User",
  role: "admin",
  onboardingCompleted: true,
};

export function useAuth() {
  // Return demo user values for demo mode (no AuthProvider needed)
  return {
    user: DEMO_USER,
    isAdmin: true,
    isStaff: false,
    canMakeChanges: true,
    deviceRestricted: false,
    onboardingCompleted: true,
  };
}
