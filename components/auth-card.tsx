import type { FormEvent } from "react";

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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">
        {authMode === "sign-in" ? "Sign in" : "Create account"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Sign in to save and manage your favorite sentence cards.
      </p>

      {!isConfigured ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
            type="email"
            value={authEmail}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            minLength={6}
            required
            type="password"
            value={authPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {authStatus ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {authStatus}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isAuthLoading || !isConfigured}
            type="submit"
          >
            {isAuthLoading
              ? "Please wait..."
              : authMode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
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
    </section>
  );
}
