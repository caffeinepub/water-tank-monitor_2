import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  useAddManualReading,
  useConfig,
  useFetchWaterLevel,
  useReadingHistory,
  useUpdateConfig,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Droplets,
  Gauge,
  LayoutDashboard,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { Config } from "./backend.d";

// ─── Status helpers ────────────────────────────────────────────────────────────

type WaterStatus = "safe" | "warning" | "danger";

function getStatus(level: number, threshold: number): WaterStatus {
  if (level >= threshold) return "danger";
  if (level >= threshold - 10) return "warning";
  return "safe";
}

// ─── Water Tank SVG ─────────────────────────────────────────────────────────

const TANK_COLORS: Record<
  WaterStatus,
  { fill: string; dark: string; wave: string }
> = {
  safe: { fill: "#60A5FA", dark: "#1D4ED8", wave: "#93C5FD" },
  warning: { fill: "#FBBF24", dark: "#B45309", wave: "#FCD34D" },
  danger: { fill: "#F87171", dark: "#B91C1C", wave: "#FCA5A5" },
};

function WaterTankSVG({
  level,
  status,
}: { level: number; status: WaterStatus }) {
  const colors = TANK_COLORS[status];
  const tankH = 224;
  const tankY = 24;
  const tankX = 10;
  const tankW = 140;
  const fillTranslate = 100 - Math.min(100, Math.max(0, level));

  return (
    <svg
      width="160"
      height="280"
      viewBox="0 0 160 280"
      aria-label={`Water tank at ${level}%`}
    >
      <title>Water Tank Visualization</title>
      <defs>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.dark} stopOpacity="1" />
        </linearGradient>
        <linearGradient id="tankBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <clipPath id="tankBodyClip">
          <rect x={tankX} y={tankY} width={tankW} height={tankH} />
        </clipPath>
        {/* Glass sheen */}
        <linearGradient id="sheenGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.1" />
          <stop offset="50%" stopColor="white" stopOpacity="0.03" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tank body background */}
      <rect
        x={tankX}
        y={tankY}
        width={tankW}
        height={tankH}
        fill="url(#tankBodyGrad)"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Water fill — translated from bottom */}
      <g clipPath="url(#tankBodyClip)">
        <rect
          x={tankX}
          y={tankY}
          width={tankW}
          height={tankH}
          fill="url(#waterGrad)"
          style={{
            transform: `translateY(${fillTranslate}%)`,
            transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
            transformBox: "fill-box",
          }}
        />
        {/* Wave overlay */}
        <rect
          x={tankX}
          y={tankY}
          width={tankW * 2}
          height="8"
          rx="4"
          fill={colors.wave}
          fillOpacity="0.5"
          style={{
            transform: `translateY(${fillTranslate}%)`,
            transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
            transformBox: "fill-box",
          }}
        />
      </g>

      {/* Side highlights (glass effect) */}
      <rect
        x={tankX}
        y={tankY}
        width={tankW}
        height={tankH}
        fill="url(#sheenGrad)"
        style={{ pointerEvents: "none" }}
      />

      {/* Tank border sides */}
      <rect
        x={tankX}
        y={tankY}
        width={tankW}
        height={tankH}
        fill="none"
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Top ellipse */}
      <ellipse
        cx="80"
        cy={tankY}
        rx="70"
        ry="12"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Bottom ellipse */}
      <ellipse
        cx="80"
        cy={tankY + tankH}
        rx="70"
        ry="12"
        fill="#0f172a"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Percentage label */}
      <text
        x="80"
        y={tankY + tankH / 2 + 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="28"
        fontWeight="700"
        fontFamily="'Plus Jakarta Sans', system-ui"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
      >
        {level}%
      </text>
    </svg>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({
  status,
  level,
  threshold,
}: { status: WaterStatus; level: number; threshold: number }) {
  const config = {
    safe: {
      label: "Normal Level",
      bg: "bg-[#052e16]",
      text: "text-[#4ade80]",
      dot: "bg-[#22c55e]",
    },
    warning: {
      label: "High Level Warning",
      bg: "bg-[#1c1300]",
      text: "text-[#fbbf24]",
      dot: "bg-[#f59e0b]",
    },
    danger: {
      label: "OVERFLOW ALERT!",
      bg: "bg-[#1c0000]",
      text: "text-[#f87171]",
      dot: "bg-[#ef4444]",
    },
  }[status];
  const _ = { level, threshold };
  void _;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-600 tracking-wide",
        config.bg,
        config.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

type NavItem = "dashboard" | "alerts" | "settings";

const NAV_ITEMS: {
  id: NavItem;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function Sidebar({
  active,
  onNav,
}: { active: NavItem; onNav: (id: NavItem) => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-card border-r border-border flex flex-col z-20 shadow-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-700 text-lg text-foreground tracking-tight">
          AquaTrack
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            data-ocid={`nav.${id}.link`}
            onClick={() => onNav(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-all duration-150",
              active === id
                ? "bg-primary/10 text-primary font-600"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with ♥ caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({
  className,
  children,
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl shadow-card border border-border p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardTitle({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-sm font-600 text-foreground mb-4", className)}>
      {children}
    </h3>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [currentLevel, setCurrentLevel] = useState(45);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [simLevel, setSimLevel] = useState(45);
  const [now, setNow] = useState(new Date());

  // Config form state
  const [formConfig, setFormConfig] = useState<Config>({
    deviceName: "Water Tank Monitor",
    location: "Main Storage Tank",
    alertThreshold: 85,
    apiEndpoint: "",
    alertsEnabled: true,
  });

  const { data: config, isLoading: configLoading } = useConfig();
  const { data: history = [] } = useReadingHistory();
  const fetchMutation = useFetchWaterLevel();
  const updateConfigMutation = useUpdateConfig();
  const addManualMutation = useAddManualReading();

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync config into form
  useEffect(() => {
    if (config) {
      setFormConfig(config);
    }
  }, [config]);

  // Poll for water level every 2 seconds
  // biome-ignore lint/correctness/useExhaustiveDependencies: polling interval intentionally runs once
  useEffect(() => {
    const doFetch = () => {
      const endpoint = formConfig.apiEndpoint;
      if (!endpoint || endpoint.trim() === "") return; // simulation mode — no polling
      fetchMutation.mutate(
        { endpoint, threshold },
        {
          onSuccess: (level) => {
            setCurrentLevel(Math.round(level));
            setIsConnected(true);
            setLastUpdated(new Date());
          },
          onError: () => {
            setIsConnected(false);
          },
        },
      );
    };

    doFetch();
    pollingRef.current = setInterval(doFetch, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Clock ticker
  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const threshold = config?.alertThreshold ?? formConfig.alertThreshold;
  const status = getStatus(currentLevel, threshold);
  const isSimMode =
    !formConfig.apiEndpoint || formConfig.apiEndpoint.trim() === "";

  const chartData = [...history]
    .slice(-20)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .map((r) => ({
      time: new Date(Number(r.timestamp) / 1_000_000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      level: Math.round(r.level),
    }));

  const handleSimLevel = (val: number[]) => {
    const v = val[0];
    setSimLevel(v);
    setCurrentLevel(v);
    addManualMutation.mutate(
      { level: v, threshold },
      {
        onSuccess: () => {
          setLastUpdated(new Date());
        },
      },
    );
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(formConfig, {
      onSuccess: () => toast.success("Configuration saved"),
      onError: () => toast.error("Failed to save configuration"),
    });
  };

  const alertMessage =
    status === "danger"
      ? `OVERFLOW ALERT: Water level at ${currentLevel}% has exceeded threshold (${threshold}%)`
      : status === "warning"
        ? `Warning: Water level at ${currentLevel}% is approaching threshold (${threshold}%)`
        : null;

  const deviceName = config?.deviceName ?? formConfig.deviceName;
  const deviceLocation = config?.location ?? formConfig.location;

  return (
    <div className="min-h-screen bg-background font-sans">
      <Toaster />
      <Sidebar active={activeNav} onNav={setActiveNav} />

      {/* Main content offset for sidebar */}
      <main className="ml-60 min-h-screen flex flex-col">
        {/* ── Top bar ── */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div>
            <h1 className="text-base font-700 text-foreground">
              Water Monitoring Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deviceName} · {deviceLocation}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div
              data-ocid="header.connection.toggle"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600",
                isConnected
                  ? "bg-[#052e16] text-[#4ade80]"
                  : "bg-[#1c0000] text-[#f87171]",
              )}
            >
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              {isConnected ? "Online" : "Offline"}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}

            {/* Date/time */}
            <div className="text-right">
              <p className="text-xs font-600 text-foreground">
                {now.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {now.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 p-6 space-y-5">
          {/* Primary 2-column grid */}
          <div className="grid grid-cols-3 gap-5">
            {/* ── Tank Card (1 col) ── */}
            <Card
              className="col-span-1 flex flex-col items-center"
              data-ocid="tank.card"
            >
              <div className="w-full flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-600 text-foreground">
                    Tank Level
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {deviceLocation}
                  </p>
                </div>
                <StatusPill
                  status={status}
                  level={currentLevel}
                  threshold={threshold}
                />
              </div>

              <WaterTankSVG level={currentLevel} status={status} />

              <div className="w-full mt-4 grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    Current Volume
                  </p>
                  <p className="text-lg font-700 text-foreground">
                    {currentLevel}%
                  </p>
                </div>
                <div className="bg-muted rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Threshold</p>
                  <p className="text-lg font-700 text-foreground">
                    {threshold}%
                  </p>
                </div>
              </div>

              {/* Simulation mode */}
              {isSimMode && (
                <div className="w-full mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-600 text-primary">
                      Simulation Mode
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      data-ocid="sim.level.input"
                      min={0}
                      max={100}
                      step={1}
                      value={[simLevel]}
                      onValueChange={handleSimLevel}
                      className="flex-1"
                    />
                    <span className="text-xs font-600 text-foreground w-10 text-right">
                      {simLevel}%
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* ── Right column ── */}
            <div className="col-span-2 flex flex-col gap-5">
              {/* Metrics card */}
              <Card data-ocid="metrics.card">
                <CardTitle>Live Metrics</CardTitle>
                <div className="grid grid-cols-3 gap-4">
                  <MetricTile
                    icon={<Activity className="w-4 h-4" />}
                    label="Water Level"
                    value={`${currentLevel}%`}
                    color="blue"
                  />
                  <MetricTile
                    icon={<Thermometer className="w-4 h-4" />}
                    label="Temperature"
                    value="—"
                    color="green"
                    sub="Sensor N/A"
                  />
                  <MetricTile
                    icon={<Gauge className="w-4 h-4" />}
                    label="Pressure"
                    value="—"
                    color="amber"
                    sub="Sensor N/A"
                  />
                </div>
              </Card>

              {/* History Chart */}
              <Card className="flex-1" data-ocid="history.card">
                <CardTitle>Water Level History (last 20 readings)</CardTitle>
                {chartData.length === 0 ? (
                  <div
                    data-ocid="history.empty_state"
                    className="h-40 flex items-center justify-center text-sm text-muted-foreground"
                  >
                    No readings yet — data will appear as levels are recorded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                    >
                      <defs>
                        <linearGradient
                          id="levelGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.07)"
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e1e",
                          border: "1px solid #374151",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#f3f4f6",
                        }}
                        formatter={(v: number) => [`${v}%`, "Level"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="level"
                        stroke="#ef4444"
                        fill="url(#levelGradient)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#ef4444" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="grid grid-cols-3 gap-5">
            {/* Alerts Card */}
            <Card data-ocid="alerts.card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="mb-0">Current Alerts</CardTitle>
              </div>
              {alertMessage ? (
                <div
                  data-ocid="alerts.error_state"
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg text-sm",
                    status === "danger"
                      ? "bg-[#1c0000] text-[#f87171]"
                      : "bg-[#1c1300] text-[#fbbf24]",
                  )}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed">{alertMessage}</p>
                </div>
              ) : (
                <div
                  data-ocid="alerts.success_state"
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#052e16] text-[#4ade80] text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">
                    All systems normal. No alerts at this time.
                  </p>
                </div>
              )}

              {alertsEnabled && status !== "safe" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Notifications are active for this alert.
                </p>
              )}
            </Card>

            {/* Alerts Toggle Card */}
            <Card data-ocid="alerts_toggle.card">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="mb-0">System Alerts</CardTitle>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-600 text-foreground">
                    Alert Notifications
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alertsEnabled
                      ? "Alerts are active"
                      : "Alerts are disabled"}
                  </p>
                </div>
                <Switch
                  data-ocid="alerts_toggle.switch"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
              </div>

              <div className="mt-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600",
                    alertsEnabled
                      ? "bg-[#052e16] text-[#4ade80]"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      alertsEnabled ? "bg-[#22c55e]" : "bg-gray-600",
                    )}
                  />
                  {alertsEnabled ? "Active" : "Inactive"}
                </span>
              </div>
            </Card>

            {/* Config Card */}
            <Card data-ocid="config.card">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="mb-0">Configuration</CardTitle>
              </div>

              {configLoading ? (
                <div data-ocid="config.loading_state" className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 bg-muted rounded-md animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Device Name
                    </Label>
                    <Input
                      data-ocid="config.name.input"
                      value={formConfig.deviceName}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          deviceName: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Location
                    </Label>
                    <Input
                      data-ocid="config.location.input"
                      value={formConfig.location}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          location: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Alert Threshold: {formConfig.alertThreshold}%
                    </Label>
                    <Slider
                      data-ocid="config.threshold.input"
                      min={0}
                      max={100}
                      step={1}
                      value={[formConfig.alertThreshold]}
                      onValueChange={(v) =>
                        setFormConfig((p) => ({ ...p, alertThreshold: v[0] }))
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Endpoint URL
                    </Label>
                    <Input
                      data-ocid="config.endpoint.input"
                      value={formConfig.apiEndpoint}
                      onChange={(e) =>
                        setFormConfig((p) => ({
                          ...p,
                          apiEndpoint: e.target.value,
                        }))
                      }
                      placeholder="http://192.168.1.100/level"
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button
                    data-ocid="config.save_button"
                    onClick={handleSaveConfig}
                    disabled={updateConfigMutation.isPending}
                    size="sm"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {updateConfigMutation.isPending
                      ? "Saving..."
                      : "Save Configuration"}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Metric tile ─────────────────────────────────────────────────────────────

function MetricTile({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "amber";
  sub?: string;
}) {
  const colorMap = {
    blue: "bg-[#0c1a33] text-[#60a5fa]",
    green: "bg-[#0a1f10] text-[#4ade80]",
    amber: "bg-[#1c1300] text-[#fbbf24]",
  };

  return (
    <div className="p-3 rounded-lg bg-muted">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
          colorMap[color],
        )}
      >
        {icon}
      </div>
      <p className="text-2xl font-700 text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}
