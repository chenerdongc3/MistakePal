import type { FormEvent } from "react";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

type AuthMode = "sign-in" | "sign-up";

export function AuthCard({
  authEmail,
  authMode,
  authPassword,
  authStatus,
  error,
  isAuthLoading,
  isConfigured,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
}: {
  authEmail: string;
  authMode: AuthMode;
  authPassword: string;
  authStatus: string;
  error: string;
  isAuthLoading: boolean;
  isConfigured: boolean;
  onEmailChange: (value: string) => void;
  onModeChange: (value: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {authMode === "sign-in" ? "Sign in" : "Create account"}
        </CardTitle>
        <CardDescription>
          Sign in to save and manage your favorite sentence cards.
        </CardDescription>
      </CardHeader>

      {!isConfigured ? (
        <Alert className="mx-5 sm:mx-6" variant="destructive">
          Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </Alert>
      ) : null}

      <CardContent>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <Input
            required
            type="email"
            value={authEmail}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <Input
            minLength={6}
            required
            type="password"
            value={authPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>

        {error ? (
          <Alert variant="destructive">{error}</Alert>
        ) : null}

        {authStatus ? (
          <Alert>{authStatus}</Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isAuthLoading || !isConfigured}
            type="submit"
          >
            {isAuthLoading
              ? "Please wait..."
              : authMode === "sign-in"
              ? "Sign in"
              : "Create account"}
          </Button>
          <button
            className="text-sm font-medium text-blue-700"
            type="button"
            onClick={() =>
              onModeChange(authMode === "sign-in" ? "sign-up" : "sign-in")
            }
          >
            {authMode === "sign-in"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
      </CardContent>
    </Card>
  );
}
