import { useLocation, Navigate } from "react-router-dom";
import { decodeToken } from "@/lib/tokenUtils";

function isTokenExpired(token: string) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const encodedToken = localStorage.getItem("access_token");
  const token = encodedToken ? decodeToken(encodedToken) : null;
  const isAuthenticated = !!encodedToken && !isTokenExpired(token);

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}
