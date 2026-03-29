import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const called = React.useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Google login failed or was canceled.");
      navigate("/login", { replace: true });
      return;
    }

    if (called.current) return;
    called.current = true;

    loginWithToken(token)
      .then(() => {
        toast.success("Welcome back! 🎉");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        toast.error("Failed to fetch user details. Please sign in again.");
        navigate("/login", { replace: true });
      });
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Zap size={48} className="text-accent animate-pulse" />
        <p className="text-foreground font-medium animate-pulse">Completing sign in...</p>
      </div>
    </div>
  );
}
