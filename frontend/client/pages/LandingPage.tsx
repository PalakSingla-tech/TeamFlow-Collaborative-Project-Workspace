import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Kanban,
  Plus,
  Rocket,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TeamFlowBrand } from "@/components/TeamFlowBrand";
import { useAuth } from "@/lib/auth";

type FeatureKey = "kanban" | "sync" | "roles" | "performance";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [activeFeature, setActiveFeature] = useState<FeatureKey>("kanban");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTickerIndex, setActiveTickerIndex] = useState(0);
  const [pulseWave, setPulseWave] = useState(0);

  const featureKeys: FeatureKey[] = ["kanban", "sync", "roles", "performance"];

  // Moving animated ticker for live actions inside the snippet
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % 4);
      setPulseWave((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  const featureCards = [
    {
      key: "kanban" as FeatureKey,
      icon: Kanban,
      title: "Flexible Kanban & Boards",
      desc: "Organize tasks into customizable stages, assign deadlines, and monitor project status with clarity.",
      badge: "Core Workflow",
    },
    {
      key: "sync" as FeatureKey,
      icon: Zap,
      title: "Instant Cloud Sync",
      desc: "Changes propagate instantaneously across your devices so everyone stays on the exact same page.",
      badge: "Real-Time",
    },
    {
      key: "roles" as FeatureKey,
      icon: Users,
      title: "Role-Based Workspaces",
      desc: "Scoped permissions for Owners, Admins, and Members. Keep project details protected and structured.",
      badge: "Team Scoped",
    },
    {
      key: "performance" as FeatureKey,
      icon: Rocket,
      title: "Blazing Fast Performance",
      desc: "Optimized modern client with instantaneous page navigation and zero unnecessary lag or heavy bottlenecks.",
      badge: "Sub-Second",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <TeamFlowBrand />

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#interactive-section"
              onClick={(e) => scrollToSection(e, "interactive-section")}
              className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={(e) => scrollToSection(e, "workflow")}
              className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              How it works
            </a>
            <a
              href="#testimonials"
              onClick={(e) => scrollToSection(e, "testimonials")}
              className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, "faq")}
              className="cursor-pointer text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/projects"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Soft Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-brand-200/40 via-sky-200/30 to-indigo-100/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 size-96 rounded-full bg-brand-100/35 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/90 bg-white/90 px-4 py-1.5 text-xs font-semibold text-brand-800 shadow-sm backdrop-blur">
              <span className="flex size-2 rounded-full bg-brand-600" />
              <span>Real-Time Collaboration • Lightweight Project Workspace</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.12]">
              Where high-velocity teams turn ideas into{" "}
              <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                continuous momentum.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
              TeamFlow brings tasks, roadmaps, teammates, and live updates together in a beautifully light and responsive workspace. Designed for clarity, focus, and speed.
            </p>

            {/* Action Buttons */}
            <div className="mt-9 flex items-center justify-center">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 text-base font-semibold text-white shadow-brand transition hover:bg-brand-700 sm:w-auto"
              >
                <span>Start Free Workspace</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Social Proof Badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 sm:gap-8">
              <div className="flex items-center gap-1.5 text-amber-500">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-slate-700">4.9/5</span>
                <span className="text-slate-500">(1,200+ team reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-brand-600" />
                <span>Instant team onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIDE-BY-SIDE INTERACTIVE SECTION (Image 1 & Image 2 Unified) */}
      <section id="interactive-section" className="relative border-t border-slate-200/80 bg-white py-20 sm:py-28 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-2xl border-b border-slate-200/80 pb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
              BUILT FOR MODERN TEAMS
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Everything your team needs to build and ship.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              A light-themed, distraction-free environment that maximizes productivity and project momentum.
            </p>
          </div>

          {/* SIDE-BY-SIDE GRID: 4 Feature Cards on Left, Moving Animated Window on Right */}
          <div className="mt-12 grid items-start gap-8 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
            {/* LEFT COLUMN: 4 Feature Cards */}
            <div className="space-y-3.5">
              {featureCards.map((feature) => {
                const isActive = activeFeature === feature.key;
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.key}
                    onClick={() => setActiveFeature(feature.key)}
                    className={`group relative flex w-full flex-col text-left rounded-2xl border p-4 sm:p-5 transition-all duration-300 focus:outline-none ${
                      isActive
                        ? "border-brand-500 bg-gradient-to-r from-brand-50/70 via-white to-white shadow-md ring-2 ring-brand-100"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid size-10 place-items-center rounded-xl transition ${
                            isActive
                              ? "bg-brand-600 text-white shadow-brand"
                              : "bg-brand-50 text-brand-600 group-hover:bg-brand-100"
                          }`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <h3
                          className={`text-sm sm:text-base font-bold tracking-tight transition ${
                            isActive ? "text-brand-900" : "text-slate-900 group-hover:text-brand-700"
                          }`}
                        >
                          {feature.title}
                        </h3>
                      </div>

                      {isActive ? (
                        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 animate-pulse">
                          Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {feature.badge}
                        </span>
                      )}
                    </div>

                    <p className="mt-2.5 pl-[52px] text-xs leading-5 text-slate-500">
                      {feature.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* RIGHT COLUMN: Moving Animated Interactive Window */}
            <div className="relative sticky top-24">
              {/* Soft Ambient Floating Glow behind window */}
              <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-tr from-brand-200/30 to-sky-200/30 blur-2xl opacity-75" />

              {/* Window Frame with gentle floating animation */}
              <div className="relative animate-gentle-float overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl transition-all">
                {/* Window Header Bar matching Image 1 */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-5 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-rose-400" />
                    <span className="size-3 rounded-full bg-amber-400" />
                    <span className="size-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-medium text-slate-500 hidden sm:inline">
                      teamflow.app/workspace/projects
                    </span>
                  </div>

                  {/* Window View Tabs */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-[11px]">
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 font-bold text-brand-700 bg-brand-50 rounded-lg">
                      <span className="size-1.5 rounded-full bg-brand-600 animate-ping" />
                      {featureCards.find((f) => f.key === activeFeature)?.title}
                    </span>
                  </div>
                </div>

                {/* SNIPPET 1: Flexible Kanban & Boards with Moving Elements */}
                {activeFeature === "kanban" && (
                  <div className="bg-canvas p-5 sm:p-7 transition-all">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                            Sprint 14: Core Features
                          </h3>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                            Live Sprint
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          18 tasks total • 4 teammates assigned • 82% complete
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          <Clock className="size-3.5 text-slate-400" /> 4 days left
                        </span>
                        <Link
                          to="/projects"
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 transition"
                        >
                          <Plus className="size-3.5" /> New Task
                        </Link>
                      </div>
                    </div>

                    {/* Columns with Indian Names & Moving States */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {/* TO DO (2) */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                            <CircleDot className="size-3 text-slate-400" />
                            TO DO
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-xs">2</span>
                        </div>

                        <div className="mt-3.5 space-y-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-300 hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-sm">
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              Security
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">
                              Two-Factor Authentication Setup
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                              Enhanced account protection and verification options for enterprise teams.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>3 checklist items</span>
                              <span className="rounded-full bg-brand-100 px-1.5 py-0.5 font-bold text-brand-700 text-[10px]" title="Aarav Sharma">
                                AS
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-300 hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-sm">
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                              Productivity
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">
                              Custom Notification Channels
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                              Configurable email alerts and instant browser push updates.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>Configured</span>
                              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 font-bold text-purple-700 text-[10px]" title="Rohan Mehta">
                                RM
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* IN PROGRESS (2) */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-brand-700">
                            <CircleDot className="size-3 text-brand-600" />
                            IN PROGRESS
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-xs">2</span>
                        </div>

                        <div className="mt-3.5 space-y-3">
                          <div className="rounded-xl border border-brand-200/90 bg-white p-3.5 shadow-xs ring-2 ring-brand-100/60 transition-all duration-300 hover:-translate-y-0.5">
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                              Design System
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">
                              Light Theme Contrast & Accessibility
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                              Enhanced contrast ratios, warm card surfaces, and accessible tokens.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Review ready
                              </span>
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 text-[10px]" title="Diya Patel">
                                DP
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-300 hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-sm">
                            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                              Workspace
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">
                              Interactive Project Creation
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                              Categorize project scopes with member counts and updated timestamps.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>In progress</span>
                              <span className="rounded-full bg-sky-100 px-1.5 py-0.5 font-bold text-sky-700 text-[10px]" title="Aditya Verma">
                                AV
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COMPLETED (4) */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                        <div className="flex items-center justify-between font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-700">
                            <Check className="size-3 text-emerald-600" />
                            COMPLETED
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-xs">4</span>
                        </div>

                        <div className="mt-3.5 space-y-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs opacity-95 transition hover:opacity-100">
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Workspace
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold line-through text-slate-700">
                              Team Workspace Onboarding
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                              Guided walk-through and instant sprint board provisioning.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span className="text-emerald-600 font-medium">Shipped</span>
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 text-[10px]" title="Pooja Verma">
                                PV
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs opacity-95 transition hover:opacity-100">
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Security
                            </span>
                            <h4 className="mt-1.5 text-xs sm:text-sm font-bold line-through text-slate-700">
                              Enterprise Role Permissions
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                              Granular access policies for Owners, Admins, and Members.
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span className="text-emerald-600 font-medium">Shipped</span>
                              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700 text-[10px]" title="Vikram Malhotra">
                                VM
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Animated Moving Activity Ticker */}
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 text-xs border border-slate-200 shadow-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span className="text-slate-600 truncate transition-all duration-300">
                          {activeTickerIndex === 0 && "Diya Patel just updated 'Light Theme Contrast' to review ready"}
                          {activeTickerIndex === 1 && "Aarav Sharma completed 'Two-Factor Authentication Setup'"}
                          {activeTickerIndex === 2 && "Rohan Mehta claimed task #108 in Sprint 14"}
                          {activeTickerIndex === 3 && "Pooja Verma verified sprint delivery with 0 open blockers"}
                        </span>
                      </div>
                      <span className="text-brand-700 font-semibold text-[11px] shrink-0 ml-2">Live Stream</span>
                    </div>
                  </div>
                )}

                {/* SNIPPET 2: Instant Cloud Sync with Moving Feed */}
                {activeFeature === "sync" && (
                  <div className="bg-canvas p-5 sm:p-7">
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                            Real-Time Cloud Synchronization
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Instant bi-directional state updates with zero latency lag
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 animate-pulse">
                        100% Synced
                      </span>
                    </div>

                    {/* Moving Live Sync Items */}
                    <div className="mt-5 space-y-2.5">
                      {[
                        { name: "Aarav Sharma", action: "checked off 'Confirm Password Verification'", time: "Just now", color: "bg-brand-100 text-brand-700" },
                        { name: "Diya Patel", action: "moved 'Light Theme Contrast' to IN PROGRESS", time: "12s ago", color: "bg-emerald-100 text-emerald-700" },
                        { name: "Rohan Mehta", action: "created new board 'Customer Portal Sprint 15'", time: "45s ago", color: "bg-purple-100 text-purple-700" },
                        { name: "Pooja Verma", action: "persisted all sprint milestones to cloud", time: "2m ago", color: "bg-sky-100 text-sky-700" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-white p-3.5 text-xs border border-slate-200 shadow-xs transition-all duration-300 hover:border-brand-200 hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${item.color}`}>
                              {item.name.charAt(0)}
                            </span>
                            <span className="text-slate-700">
                              <strong className="text-slate-900">{item.name}</strong> {item.action}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">{item.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* Moving Sync Bar */}
                    <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 text-xs">
                      <div className="flex justify-between items-center mb-1.5 text-slate-600">
                        <span className="font-semibold text-slate-700">Live Device Synchronization</span>
                        <span className="text-emerald-600 font-bold">Connected • Sub-Second</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* SNIPPET 3: Role-Based Workspaces with Moving Presence */}
                {activeFeature === "roles" && (
                  <div className="bg-canvas p-5 sm:p-7">
                    <div className="border-b border-slate-200/70 pb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                        Workspace Roles & Scoped Permissions
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage project governance with Owner, Admin, and Member permission tiers
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
                      {[
                        { name: "Aarav Sharma", role: "Owner", tag: "Full Administration", desc: "Full control over projects, team seats, and settings." },
                        { name: "Diya Patel", role: "Admin", tag: "Sprint Management", desc: "Can create projects, invite members, and manage boards." },
                        { name: "Rohan Mehta", role: "Member", tag: "Task Execution", desc: "Can claim tasks, post updates, and track sprint milestones." },
                      ].map((item, idx) => (
                        <div
                          key={item.name}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-300 hover:border-brand-200 hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="relative">
                              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                                {item.name.charAt(0)}
                              </span>
                              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              {item.role}
                            </span>
                          </div>
                          <h4 className="mt-3 text-sm font-bold text-slate-900">{item.name}</h4>
                          <p className="text-[11px] font-medium text-brand-600">{item.tag}</p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* Moving Live Collaborators Ticker */}
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 text-xs border border-slate-200 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-slate-600">
                          {pulseWave === 0 && "Aarav Sharma is editing sprint roadmaps in Bengaluru"}
                          {pulseWave === 1 && "Diya Patel is actively collaborating from Mumbai"}
                          {pulseWave === 2 && "Rohan Mehta is reviewing task priorities in Hyderabad"}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        3 Active Now
                      </span>
                    </div>
                  </div>
                )}

                {/* SNIPPET 4: Blazing Fast Performance with Moving Gauges */}
                {activeFeature === "performance" && (
                  <div className="bg-canvas p-5 sm:p-7">
                    <div className="border-b border-slate-200/70 pb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                        Sub-Second Performance & Predictable Sprints
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Instantaneous page navigation, zero unnecessary bloat, and smooth real-time velocity
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sprint Completion</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">82.4%</p>
                        <p className="text-[11px] font-medium text-emerald-600 mt-0.5">+12% velocity</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points Done</p>
                        <p className="mt-1 text-2xl font-extrabold text-brand-600">48 / 56</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">8 pts remaining</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cycle Time</p>
                        <p className="mt-1 text-2xl font-extrabold text-emerald-600">1.8 days</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Fast turnaround</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">UI Latency</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">&lt; 50ms</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Instant response</p>
                      </div>
                    </div>

                    {/* Moving Burndown Chart Bars */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="font-bold text-slate-800">Sprint Delivery Velocity</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-Time Metric
                        </span>
                      </div>
                      <div className="flex h-20 items-end gap-3 border-b border-slate-100 pb-2">
                        {[
                          { day: "Day 1", h: "80%" },
                          { day: "Day 2", h: "70%" },
                          { day: "Day 3", h: "52%" },
                          { day: "Day 4", h: "38%" },
                          { day: "Day 5", h: "20%" },
                          { day: "Day 6", h: "12%" },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                            <div
                              style={{ height: bar.h }}
                              className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-indigo-500 transition-all duration-700 hover:opacity-90"
                            />
                            <span className="text-[10px] font-medium text-slate-400">{bar.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / Workflow Walkthrough */}
      <section id="workflow" className="border-t border-slate-200/80 bg-canvas py-20 sm:py-28 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Seamless Setup</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              From kickoff to delivery in 3 simple steps
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Get your entire team aligned without complicated onboarding procedures.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create your workspace",
                text: "Sign up in seconds and establish your workspace foundation. Invite teammates and begin collaborating right away.",
              },
              {
                step: "02",
                title: "Organize projects & milestones",
                text: "Set up project workspaces for key team initiatives. Categorize tasks, deadlines, and assign clear responsibilities.",
              },
              {
                step: "03",
                title: "Collaborate and deliver on time",
                text: "Track progress across boards, review sprint milestones, and ship products together with complete clarity.",
              },
            ].map((step, idx) => (
              <div key={idx} className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
                <span className="text-3xl font-extrabold text-brand-600/30">{step.step}</span>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section with Indian Names */}
      <section id="testimonials" className="border-t border-slate-200/80 bg-white py-20 sm:py-28 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Loved by Builders</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Loved by high-performing teams across India & beyond.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              See what engineers, product managers, and founders say about working in TeamFlow.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "TeamFlow replaced three different cluttered tools for our squad. The light visual design is so calming, and our sprint velocity has never been higher.",
                author: "Pooja Verma",
                role: "VP of Engineering at FinScale, Bengaluru",
                initials: "PV",
              },
              {
                quote:
                  "The real-time updates across our sprint boards and effortless task transitions make daily standups seamless. It just works with zero friction.",
                author: "Kavya Nair",
                role: "Product Lead at CloudNext, Hyderabad",
                initials: "KN",
              },
              {
                quote:
                  "Clean, fast, and beautifully organized. The role-based permissions and instant sync gave our team the confidence to migrate all active roadmaps here.",
                author: "Vikram Malhotra",
                role: "Head of Operations at NovaStack, Mumbai",
                initials: "VM",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs transition hover:shadow-sm"
              >
                <div>
                  <div className="flex text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-6 text-slate-700 italic">“{item.quote}”</p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {item.initials}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.author}</p>
                    <p className="text-[11px] text-slate-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-slate-200/80 bg-canvas py-20 sm:py-28 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Got Questions?</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Everything you need to know about TeamFlow and your team workspace.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: "Can I invite team members and assign different roles?",
                a: "Yes! TeamFlow features role-based access control. You can assign teammates as Workspace Owners, Admins, or Members, ensuring appropriate visibility, editing rights, and security across projects.",
              },
              {
                q: "How does real-time synchronization work across devices?",
                a: "Whenever any teammate updates a task status, reorders boards, or modifies sprint deadlines, changes are instantly synchronized across all active devices without needing to refresh.",
              },
              {
                q: "Can we organize tasks with customized Kanban boards?",
                a: "Absolutely. You can tailor board workflow stages, categorize items with priority tags, set target completion dates, and track progress smoothly from backlog to delivery.",
              },
              {
                q: "Is there a limit on how many projects or sprint boards we can create?",
                a: "No artificial limits. You can create and manage multiple concurrent projects, task boards, and roadmaps within your TeamFlow workspace as your team grows.",
              },
              {
                q: "How is our team data kept secure and private?",
                a: "Your team workspace is secured with enterprise-grade encrypted authentication, strict session scoping, and role-based policies to ensure only authorized members have access to your data.",
              },
              {
                q: "Can our team access TeamFlow on mobile and tablet devices?",
                a: "Yes. TeamFlow is built with a fully responsive layout optimized for smartphones, tablets, laptops, and desktop displays so you can stay productive anywhere.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-slate-900 transition hover:bg-slate-50"
                >
                  <span className="text-base">{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="size-5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="size-5 shrink-0 text-slate-400" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 text-sm leading-6 text-slate-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner (Light Gradient, No Pricing) */}
      <section className="border-t border-slate-200/80 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50/90 via-sky-50/50 to-indigo-50/70 p-10 text-center shadow-lg sm:p-16">
            <div className="pointer-events-none absolute -left-20 top-0 size-80 rounded-full bg-brand-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-indigo-200/40 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/90 px-3.5 py-1 text-xs font-bold text-brand-800 shadow-xs">
                <Rocket className="size-3.5" /> Start in under 1 minute
              </span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Ready to bring clarity and speed to your team?
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Join forward-thinking product teams using TeamFlow to manage projects and deliverables with confidence.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-brand transition hover:bg-brand-700 sm:w-auto"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-12 text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <TeamFlowBrand />
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} TeamFlow. The modern collaborative project workspace.
          </p>
          <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
            <a href="#interactive-section" className="hover:text-brand-600">Features</a>
            <a href="#workflow" className="hover:text-brand-600">Workflow</a>
            <a href="#testimonials" className="hover:text-brand-600">Testimonials</a>
            <Link to="/login" className="hover:text-brand-600">Sign in</Link>
            <Link to="/register" className="hover:text-brand-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
