import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, clearStoredSession, setUnauthorizedHandler } from "@/lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
};

type AuthResponse = {
  accessToken?: string;
  token?: string;
  jwt?: string;
  user?: Partial<AuthUser> & { fullName?: string };
  data?: any;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, username?: string) => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const storedUser = window.sessionStorage.getItem("teamflow.user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    clearStoredSession();
    return null;
  }
}

function createSession(response: any, identifier: string, fallbackName?: string): AuthUser {
  const token =
    response?.accessToken ??
    response?.token ??
    response?.jwt ??
    response?.data?.accessToken ??
    response?.data?.token ??
    response?.data?.jwt;

  if (!token) {
    throw new Error("The server did not return a session token.");
  }

  const userData = response?.user ?? response?.data?.user ?? response;

  const isEmail = identifier.includes("@");
  let realEmail: string = userData?.email || "";

  if (!realEmail) {
    if (isEmail) {
      realEmail = identifier;
    } else if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`tf_user_email_${identifier.toLowerCase()}`);
      if (stored) realEmail = stored;
    }
  }

  // Also inspect JWT payload claims if available
  if (!realEmail && token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.email) realEmail = payload.email;
      }
    } catch {
      // ignore
    }
  }

  const fallbackUsername = isEmail ? identifier.split("@")[0] : identifier;

  const user: AuthUser = {
    id: String(userData?.userId ?? userData?.id ?? identifier),
    name: userData?.name ?? userData?.fullName ?? fallbackName ?? fallbackUsername,
    email: realEmail,
    username: userData?.username ?? fallbackUsername,
  };

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("teamflow.access-token", token);
    window.sessionStorage.setItem("teamflow.user", JSON.stringify(user));
  }
  return user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("teamflow.user", JSON.stringify(updated));
        if (updated.username && updated.email) {
          window.localStorage.setItem(`tf_user_email_${updated.username.toLowerCase()}`, updated.email);
        }
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(() => undefined);
  }, [logout]);

  const login = useCallback(async (identifier: string, password: string) => {
    const payload = {
      identifier,
      usernameOrEmail: identifier,
      email: identifier,
      username: identifier,
      password,
    };

    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setUser(createSession(response, identifier));
  }, []);

  const register = useCallback(async (usernameOrName: string, email: string, password: string, username?: string) => {
    const userHandle = username?.trim() || usernameOrName?.trim() || (email.includes("@") ? email.split("@")[0] : "");
    const displayName = usernameOrName?.trim() || userHandle;
    const payload = {
      username: userHandle,
      email,
      password,
      confirmPassword: password,
      name: displayName,
      fullName: displayName,
    };

    // Cache the registered email for this username
    if (typeof window !== "undefined" && userHandle && email) {
      window.localStorage.setItem(`tf_user_email_${userHandle.toLowerCase()}`, email);
    }

    await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      updateUser,
      logout,
    }),
    [login, logout, register, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
