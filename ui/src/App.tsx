import {
  Suspense,
  createContext,
  lazy,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Navigate,
  Outlet,
  Routes,
  Route,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { LandingPage } from "./features/landing";
import { LoginPage } from "./features/auth/LoginPage";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./features/auth/VerifyEmailPage";
import { VerifyEmailRequestPage } from "./features/auth/VerifyEmailRequestPage";
import { TripInvitePage } from "./features/trips/TripInvitePage";
import { AppShell, type AppView } from "./app/AppShell";
import { ArchivePage } from "./features/archive/ArchivePage";
import { PrivacyPage } from "./features/static/PrivacyPage";
import { SupportPage } from "./features/static/SupportPage";
import { TermsPage } from "./features/static/TermsPage";
import { getMe, type LoginResponse, type UserProfile } from "./shared/api/auth";
import { getTrips, type Trip } from "./shared/api/trips";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
  track,
} from "./shared/analytics";
import {
  clearStoredSession,
  getStoredAccessToken,
  readStoredUser,
  SESSION_CLEARED_EVENT,
  SESSION_EVENT,
  storeSession,
  storeSessionUser,
} from "./shared/auth/session";

const TripList = lazy(() =>
  import("./features/trips/TripList").then((m) => ({ default: m.TripList })),
);
const CreateTripForm = lazy(() =>
  import("./features/trips/CreateTripForm").then((m) => ({
    default: m.CreateTripForm,
  })),
);
const ExplorePage = lazy(() =>
  import("./features/explore").then((m) => ({ default: m.ExplorePage })),
);
const MatchingPage = lazy(() =>
  import("./features/profile").then((m) => ({ default: m.MatchingPage })),
);
const ProfilePage = lazy(() =>
  import("./features/profile").then((m) => ({ default: m.ProfilePage })),
);

const EXPLORE_ENABLED = import.meta.env.VITE_ENABLE_EXPLORE === "true";

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  completeLogin: (session: LoginResponse) => Promise<void>;
  logout: () => void;
}

interface AppLayoutContextValue {
  token: string;
  user: UserProfile;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  refreshTrips: () => Promise<void>;
  navigateToView: (view: AppView, tripId?: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within App");
  }
  return value;
}

function useAppLayoutContext() {
  return useOutletContext<AppLayoutContextValue>();
}

function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory font-sans text-flint text-sm">
      {label}
    </div>
  );
}

function routeForView(view: AppView, tripId?: number): string {
  switch (view) {
    case "explore":
      return EXPLORE_ENABLED ? "/app/explore" : "/app/trips";
    case "archive":
      return "/app/archive";
    case "matching":
      return "/app/matching";
    case "profile":
      return "/app/profile";
    case "trips":
    default:
      return tripId ? `/app/trips/${tripId}` : "/app/trips";
  }
}

function viewFromPath(pathname: string): AppView {
  if (pathname.startsWith("/app/explore"))
    return EXPLORE_ENABLED ? "explore" : "trips";
  if (pathname.startsWith("/app/archive")) return "archive";
  if (pathname.startsWith("/app/matching")) return "matching";
  if (pathname.startsWith("/app/profile")) return "profile";
  if (pathname.startsWith("/app/workspace")) return "trips";
  return "trips";
}

function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <FullPageLoading label="Loading…" />;
  }

  if (!auth.isAuthenticated) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/app/trips";

  if (auth.loading) {
    return <FullPageLoading label="Loading…" />;
  }

  if (auth.isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  return <>{children}</>;
}

function MarketingHome() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.loading) {
    return <FullPageLoading label="Loading…" />;
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/app/trips" replace />;
  }

  return (
    <LandingPage
      onGetStarted={() => navigate("/register")}
      onSignIn={() => navigate("/login")}
    />
  );
}

function AuthRoute({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/app/trips";

  return (
    <LoginPage
      initialMode={mode}
      forgotPasswordHref="/forgot-password"
      onBack={() => navigate("/")}
      onLoginSuccess={async (session) => {
        await auth.completeLogin(session);
        navigate(returnTo, { replace: true });
      }}
    />
  );
}

function AppLayout() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);

  const refreshTrips = useCallback(async () => {
    if (!token) return;
    try {
      const nextTrips = await getTrips(token);
      startTransition(() => {
        setTrips(nextTrips);
      });
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadTrips = async () => {
      if (!token) return;
      try {
        const nextTrips = await getTrips(token);
        if (!cancelled) {
          startTransition(() => {
            setTrips(nextTrips);
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    void loadTrips();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const navigateToView = useCallback(
    (view: AppView, tripId?: number) => {
      track({
        name: "view_changed",
        props: { from: viewFromPath(location.pathname), to: view },
      });
      navigate(routeForView(view, tripId));
    },
    [location.pathname, navigate],
  );

  if (!token || !user) {
    return <FullPageLoading label="Loading…" />;
  }

  return (
    <AppShell
      view={viewFromPath(location.pathname)}
      onViewChange={navigateToView}
      userEmail={user.email}
      onLogout={() => {
        logout();
        navigate("/", { replace: true });
      }}
    >
      <Suspense
        fallback={
          <div className="text-sm text-flint p-4">Loading section…</div>
        }
      >
        <Outlet
          context={{
            token,
            user,
            trips,
            setTrips,
            refreshTrips,
            navigateToView,
          }}
        />
      </Suspense>
    </AppShell>
  );
}

function MatchingRoute() {
  const { token, trips } = useAppLayoutContext();
  return <MatchingPage token={token} trips={trips} />;
}

function ProfileRoute() {
  const { trips, user } = useAppLayoutContext();
  return <ProfilePage trips={trips} userEmail={user.email} />;
}

function ArchiveRoute() {
  const { trips, navigateToView } = useAppLayoutContext();
  const navigate = useNavigate();

  return (
    <ArchivePage
      trips={trips}
      onNavigate={navigateToView}
      onCreateFromDestination={(destination) => {
        track({
          name: "plan_trip_clicked",
          props: { source_view: "archive", destination },
        });
        navigate(
          `/app/trips/new?destination=${encodeURIComponent(destination)}`,
        );
      }}
    />
  );
}

function ExploreRoute() {
  const { trips } = useAppLayoutContext();
  const navigate = useNavigate();

  return (
    <ExplorePage
      plannedDestinations={trips.map((trip) => trip.destination)}
      onStartTrip={(destination) => {
        track({
          name: "plan_trip_clicked",
          props: { source_view: "explore", destination },
        });
        navigate(
          `/app/trips/new?destination=${encodeURIComponent(destination)}`,
        );
      }}
    />
  );
}

function TripsListRoute() {
  const { token, user, setTrips, trips } = useAppLayoutContext();
  const navigate = useNavigate();
  const { tripId } = useParams();
  const location = useLocation();

  useEffect(() => {
    if (tripId || trips.length === 0) return;

    const now = new Date();
    const withParsedDates = trips
      .map((trip) => ({
        trip,
        start: new Date(`${trip.start_date}T00:00:00`),
        end: new Date(`${trip.end_date}T23:59:59`),
      }))
      .filter(
        ({ start, end }) =>
          !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()),
      );

    const activeTrip = withParsedDates
      .filter(({ start, end }) => start <= now && now <= end)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.trip;
    const upcomingTrip = withParsedDates
      .filter(({ start }) => start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.trip;
    const fallbackTrip = [...trips].sort((a, b) => b.id - a.id)[0];

    const targetTripId = activeTrip?.id ?? upcomingTrip?.id ?? fallbackTrip?.id;
    if (!targetTripId) return;
    navigate(`/app/trips/${targetTripId}`, { replace: true });
  }, [navigate, tripId, trips]);

  return (
    <TripList
      token={token}
      currentUserEmail={user.email}
      onCreateClick={() => navigate("/app/trips/new")}
      initialTripId={tripId ? Number(tripId) : undefined}
      onTripSelect={(nextTripId) =>
        navigate(nextTripId ? `/app/trips/${nextTripId}` : location.pathname, {
          replace: true,
        })
      }
      onTripsChange={setTrips}
    />
  );
}

function TripsCreateRoute() {
  const { token, setTrips } = useAppLayoutContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultDestination = searchParams.get("destination") ?? undefined;

  return (
    <CreateTripForm
      token={token}
      defaultDestination={defaultDestination}
      onSuccess={(newTrip) => {
        setTrips((prev) => [...prev, newTrip]);
        navigate(`/app/trips/${newTrip.id}?from=create`, { replace: true });
      }}
      onCancel={() => navigate("/app/trips")}
    />
  );
}

function WorkspaceRoute() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  return (
    <Navigate
      to={`/app/trips/${tripId ?? ""}${from ? `?from=${from}` : ""}`}
      replace
    />
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() =>
    getStoredAccessToken(),
  );
  const [loading, setLoading] = useState(true);

  const syncFromStorage = useCallback(() => {
    setToken(getStoredAccessToken());
    setUser(readStoredUser());
  }, []);

  useEffect(() => {
    const handleUpdate = () => syncFromStorage();
    const handleClear = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener(SESSION_EVENT, handleUpdate);
    window.addEventListener(SESSION_CLEARED_EVENT, handleClear);

    return () => {
      window.removeEventListener(SESSION_EVENT, handleUpdate);
      window.removeEventListener(SESSION_CLEARED_EVENT, handleClear);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const currentToken = getStoredAccessToken();
      if (!currentToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getMe(currentToken);
        if (!cancelled) {
          storeSessionUser(profile);
          setUser(profile);
          setToken(getStoredAccessToken());
        }
      } catch {
        if (!cancelled) {
          clearStoredSession();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) {
      identifyAnalyticsUser(user);
      return;
    }

    resetAnalyticsUser();
  }, [user]);

  const completeLogin = useCallback(async (session: LoginResponse) => {
    storeSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    const profile = await getMe(session.access_token);
    storeSessionUser(profile);
    setToken(getStoredAccessToken());
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    track({ name: "auth_logout_completed" });
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      completeLogin,
      logout,
    }),
    [completeLogin, loading, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AppRoutes() {
  const auth = useAuth();
  const location = useLocation();

  useEffect(() => {
    track({
      name: "page_viewed",
      props: {
        path: location.pathname,
      },
    });
  }, [location.pathname]);

  if (auth.loading && getStoredAccessToken()) {
    return <FullPageLoading label="Loading…" />;
  }

  return (
    <Routes>
      <Route path="/" element={<MarketingHome />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <AuthRoute mode="login" />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <AuthRoute mode="register" />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnlyRoute>
            <ResetPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/verify-email/request"
        element={<VerifyEmailRequestPage />}
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route
        path="/invites/:inviteToken"
        element={<TripInvitePage token={auth.token} user={auth.user} />}
      />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="trips" replace />} />
          <Route path="archive" element={<ArchiveRoute />} />
          <Route
            path="explore"
            element={
              EXPLORE_ENABLED ? (
                <ExploreRoute />
              ) : (
                <Navigate to="/app/trips" replace />
              )
            }
          />
          <Route path="matching" element={<MatchingRoute />} />
          <Route path="profile" element={<ProfileRoute />} />
          <Route path="trips" element={<TripsListRoute />} />
          <Route path="trips/new" element={<TripsCreateRoute />} />
          <Route path="trips/:tripId" element={<TripsListRoute />} />
          <Route path="workspace/:tripId" element={<WorkspaceRoute />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={auth.isAuthenticated ? "/app/trips" : "/"}
            replace
          />
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
