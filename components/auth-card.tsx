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
  authVerificationCode,
  error,
  isAuthLoading,
  isVerificationPending,
  isConfigured,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onResendVerification,
  onSubmit,
  onVerificationCodeChange,
  onVerifyEmail,
  onUseAnotherEmail,
}: {
  authEmail: string;
  authMode: AuthMode;
  authPassword: string;
  authStatus: string;
  authVerificationCode: string;
  error: string;
  isAuthLoading: boolean;
  isVerificationPending: boolean;
  isConfigured: boolean;
  onEmailChange: (value: string) => void;
  onModeChange: (value: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onResendVerification: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerificationCodeChange: (value: string) => void;
  onVerifyEmail: (event: FormEvent<HTMLFormElement>) => void;
  onUseAnotherEmail: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {authMode === "sign-in" ? "Sign in" : "Create account"}
        </CardTitle>
        <CardDescription>
          {authMode === "sign-in"
            ? "Sign in with your email and password."
            : "Create an account, then verify your email code."}
        </CardDescription>
      </CardHeader>

      {!isConfigured ? (
        <Alert className="mx-5 sm:mx-6" variant="destructive">
          Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </Alert>
      ) : null}

      <CardContent>
      {isVerificationPending ? (
        <form className="space-y-4" onSubmit={onVerifyEmail}>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-950">Verify your email</p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              We sent a one-time code to {authEmail}. Enter it to finish
              creating your account.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Email verification code
            </span>
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              value={authVerificationCode}
              onChange={(event) => onVerificationCodeChange(event.target.value)}
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
              {isAuthLoading ? "Please wait..." : "Verify and sign in"}
            </Button>
            <button
              className="text-sm font-medium text-blue-700"
              disabled={isAuthLoading}
              onClick={onResendVerification}
              type="button"
            >
              Resend code
            </button>
            <button
              className="text-sm font-medium text-slate-600"
              disabled={isAuthLoading}
              onClick={onUseAnotherEmail}
              type="button"
            >
              Use another email
            </button>
          </div>
        </form>
      ) : (
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
      )}
      </CardContent>
    </Card>
  );
}
