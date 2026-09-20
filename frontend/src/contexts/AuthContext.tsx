import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  is_suspended?: boolean;
  suspension_until?: string | Date | null;
  suspension_letter?: string | null;
  disciplinary_notice_url?: string | null;
  suspension_appeal?: {
    submitted: boolean;
    statement: string | null;
    supporting_document: string | null;
    submitted_at: string | null;
    status: 'Pending' | 'Approved' | 'Rejected';
    admin_notes: string | null;
    reviewed_at: string | null;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🎯 Hardened Backend URL Resolution
const getApiUrl = (endpoint: string) => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl === "undefined" || envUrl.includes("undefined")) {
    envUrl = "http://localhost:5000/api";
  }
  let baseUrl = envUrl.replace(/\/$/, "");
  if (!baseUrl.endsWith("/api")) {
    baseUrl = `${baseUrl}/api`;
  }
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem("user");
      if (!stored || stored === "undefined") return null;
      return JSON.parse(stored);
    } catch (err) {
      console.error("Failed to parse user from session storage", err);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // 🛡️ Safe fetch helper with automatic retry to port 5000
  const safeFetch = async (endpointPath: string, options: RequestInit) => {
    let targetUrl = getApiUrl(endpointPath);
    console.log(`[API Request] Calling: ${targetUrl}`);

    let res;
    try {
      res = await fetch(targetUrl, options);
    } catch (netErr) {
      // Primary fetch failed, fallback directly to explicit backend port 5000
      targetUrl = `http://localhost:5000/api${endpointPath.startsWith("/") ? endpointPath : "/" + endpointPath}`;
      console.log(`[API Retry] Falling back to: ${targetUrl}`);
      res = await fetch(targetUrl, options);
    }

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error("Non-JSON API response received:", text);
      throw new Error("Server returned an invalid or empty response.");
    }

    if (!res.ok) {
      // If 404, retry directly on http://localhost:5000/api/
      if (res.status === 404 && !targetUrl.includes("http://localhost:5000")) {
        const fallbackUrl = `http://localhost:5000/api${endpointPath.startsWith("/") ? endpointPath : "/" + endpointPath}`;
        console.log(`[API 404 Retry] Calling direct backend: ${fallbackUrl}`);
        const fallbackRes = await fetch(fallbackUrl, options);
        const fbText = await fallbackRes.text();
        const fbData = fbText ? JSON.parse(fbText) : {};
        if (fallbackRes.ok) return fbData;
      }
      const err: any = new Error(data.message || data.error || `Request failed with status ${res.status}`);
      err.data = data;
      err.status = res.status;
      throw err;
    }

    return data;
  };

  // 🔐 LOGIN
  const login = async (email: string, password: string, otp?: string) => {
    setLoading(true);
    try {
      const data = await safeFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp }),
      });

      if (data.requireOtp) {
        return data;
      }

      setUser(data);
      sessionStorage.setItem("user", JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  };

  // 📝 REGISTER
  const register = async (userData: any) => {
    setLoading(true);
    try {
      const data = await safeFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (data.requireOtp) {
        return data;
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 LOGOUT
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
    toast.success("Successfully logged out");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
