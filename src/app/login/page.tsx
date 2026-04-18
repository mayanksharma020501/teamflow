"use client";

import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      {/* Decorative blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-indigo-500/5 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Zap size={24} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TeamFlow
            </h1>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your tasks and collaborate with your team
            </p>
          </div>

          {/* Google Sign In */}
          <div className="mb-6">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:shadow-md"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <p className="mt-2 text-[10px] text-center text-muted-foreground">
              Note: Google login requires environment variable configuration.
            </p>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground font-medium">Or</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase text-center mb-1">Development Access</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get("email") as string;
              signIn("credentials", { email, callbackUrl: "/dashboard" });
            }} className="flex flex-col gap-3">
              <input 
                type="email" 
                name="email"
                placeholder="Enter email..."
                defaultValue="test@teamflow.com" 
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20"
              />
              <button type="submit" className="w-full bg-indigo-500 text-white font-semibold py-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                Sign in as Developer
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-indigo-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { emoji: "⚡", label: "Fast & Intuitive" },
            { emoji: "👥", label: "Team Collaboration" },
            { emoji: "📊", label: "Smart Analytics" },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur p-3 border border-border/30"
            >
              <div className="text-2xl mb-1">{f.emoji}</div>
              <div className="text-xs font-medium text-muted-foreground">
                {f.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
