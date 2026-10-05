import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TeamFlowBrand } from "@/components/TeamFlowBrand";
import { useAuth } from "@/lib/auth";

const benefits = [
  "Consolidate projects, milestones, tasks, and real-time updates.",
  "Give every team member clear ownership, deadlines, and visibility.",
  "Stay organized with custom boards, sprint planning, and instant notifications.",
];

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();
  const isRegister = location.pathname === "/register";

  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState(""); // Email or Username for Login
  const [email, setEmail] = useState(""); // Email for Register
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isRegister && location.state?.registeredIdentifier) {
      setIdentifier(location.state.registeredIdentifier);
    }
  }, [isRegister, location.state]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isRegister) {
      if (!username.trim()) {
        setError("Please choose a username.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!confirmPassword) {
        setError("Please confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify both fields.");
        return;
      }

      setIsSubmitting(true);
      try {
        await register(username.trim(), email.trim(), password, username.trim());
        const registeredIdentifier = username.trim();
        toast.success("Account created successfully!", {
          description: "Please sign in with your username or email to continue.",
        });
        navigate("/login", {
          replace: true,
          state: { registeredIdentifier },
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to complete registration. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Login mode
      const trimmedIdentifier = identifier.trim();
      if (!trimmedIdentifier) {
        setError("Please enter your email address or username.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }

      setIsSubmitting(true);
      try {
        await login(trimmedIdentifier, password);
        navigate("/dashboard", { replace: true });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Invalid credentials. Please verify your username/email and password."
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
      {/* Left side: Light-themed Hero Showcase */}
      <section className="relative hidden overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-slate-50 via-brand-50/40 to-sky-50/50 px-12 py-12 text-slate-900 lg:flex lg:flex-col xl:px-20">
        {/* Soft background ambient glow */}
        <div className="pointer-events-none absolute -left-20 top-12 size-96 rounded-full bg-brand-200/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 size-80 rounded-full bg-sky-200/30 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <TeamFlowBrand />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-700"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>
        </div>

        <div className="relative my-auto max-w-xl py-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-brand-800 shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Work in sync, in real time
          </span>

          <h1 className="mt-7 text-4xl font-extrabold leading-[1.12] tracking-[-0.04em] text-slate-950 xl:text-[2.75rem]">
            The light, calm workspace for high-velocity teams.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            TeamFlow gives every project, sprint, and teammate a shared home. Move fast with complete clarity and zero clutter.
          </p>

          <ul className="mt-9 space-y-3.5">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/80 p-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Feature summary cards */}
        <div className="relative grid grid-cols-2 gap-4 pt-4 text-sm">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <UsersRound className="size-5" />
            </div>
            <p className="mt-3.5 font-bold text-slate-900">Unified Team Sync</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Every teammate sees tasks, status, and project updates instantly.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
            <p className="mt-3.5 font-bold text-slate-900">Data Protection</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Secure authentication, encrypted sessions, and scoped team workspaces.
            </p>
          </div>
        </div>
      </section>

      {/* Right side: Auth Form */}
      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-between lg:hidden mb-8">
            <TeamFlowBrand />
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"
            >
              <ArrowLeft className="size-3" /> Home
            </Link>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              <Sparkles className="size-3" />
              {isRegister ? "Join Your Team" : "Welcome Back"}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-slate-950">
              {isRegister ? "Create workspace account" : "Sign in to TeamFlow"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isRegister
                ? "Sign up in seconds and start collaborating on your projects."
                : "Welcome back! Glad to see you again. Enter your details to continue to your workspace."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            {isRegister && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-800">
                    Username
                  </label>
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="e.g. aaravs"
                    disabled={isSubmitting}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="aarav@company.com"
                    disabled={isSubmitting}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                  />
                </div>
              </>
            )}

            {!isRegister && (
              <div>
                <label htmlFor="identifier" className="block text-sm font-semibold text-slate-800">
                  Email address or username
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="aarav@company.com or aaravs"
                  disabled={isSubmitting}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-800">
                  Confirm password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-3 text-sm leading-5 text-rose-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isRegister ? "Create workspace account" : "Sign in to workspace"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? "Already registered?" : "Need a workspace account?"}{" "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-semibold text-brand-700 transition hover:text-brand-800 underline-offset-4 hover:underline"
            >
              {isRegister ? "Sign in instead" : "Create one now"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
