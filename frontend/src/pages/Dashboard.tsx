import { useState, useEffect, useMemo } from "react";
import { Activity, TrendingUp, Trophy, DollarSign, Repeat2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { generateRandomEvent, generatePriceHistory, fetchDashboardMetrics } from "@/api";

export default function Dashboard() {
  const [events, setEvents] = useState<{ time: string; text: string }[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: { value: 284750, change: 12.4 },
    conversionRate: { control: 3.2, treatment: 4.7 },
    avgOrderValue: { value: 2849, change: 8.1 },
    activeSessions: 178,
  });

  const priceHistory = useMemo(() => generatePriceHistory(), []);
  const lineKeys = useMemo(() => Object.keys(priceHistory[0] || {}).filter((k) => k !== "hour"), [priceHistory]);
  const lineColors = ["#ff6b00", "#1a1f71", "#00c853", "#ff1744", "#ffab00"];

  const abData = [
    { metric: "Conversion Rate", control: 3.2, treatment: 4.7 },
    { metric: "AOV (₹)", control: 2450, treatment: 2849 },
    { metric: "Rev/Session (₹)", control: 78.4, treatment: 133.9 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => [
        { time: new Date().toLocaleTimeString(), text: generateRandomEvent() },
        ...prev.slice(0, 49),
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const m = await fetchDashboardMetrics();
      setMetrics(m);
    }, 10000);
    fetchDashboardMetrics().then(setMetrics);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    { label: "Total Revenue", value: `₹${metrics.totalRevenue.value.toLocaleString("en-IN")}`, change: `+${metrics.totalRevenue.change}%`, icon: <DollarSign size={20} />, positive: true },
    { label: "Conversion Rate", value: `${metrics.conversionRate.treatment}%`, change: `+${(metrics.conversionRate.treatment - metrics.conversionRate.control).toFixed(1)}%`, icon: <Repeat2 size={20} />, positive: true },
    { label: "Avg Order Value", value: `₹${metrics.avgOrderValue.value.toLocaleString("en-IN")}`, change: `+${metrics.avgOrderValue.change}%`, icon: <TrendingUp size={20} />, positive: true },
    { label: "Active Sessions", value: metrics.activeSessions.toString(), change: "live", icon: <Activity size={20} />, positive: true },
  ];

  return (
    <div className="container py-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">PriceIQ Analytics — Live</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className="text-accent">{k.icon}</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{k.value}</p>
            <span className={`text-xs font-semibold ${k.positive ? "text-success" : "text-destructive"}`}>{k.change}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* A/B Test */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">A/B Test Results</h2>
              <span className="flex items-center gap-1 text-sm font-semibold text-warning"><Trophy size={16} /> Variant B Wins</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div className="rounded-md bg-secondary p-3 space-y-1">
                <p className="text-muted-foreground">Variant A (Control)</p>
                <p className="font-medium text-card-foreground">Rule-based pricing</p>
                <p className="text-muted-foreground">3.2% · ₹2,450 · ₹78.4/sess · 5,200 sess</p>
              </div>
              <div className="rounded-md bg-accent/10 border border-accent/30 p-3 space-y-1">
                <p className="text-accent font-semibold">Variant B (Treatment)</p>
                <p className="font-medium text-card-foreground">Dynamic pricing</p>
                <p className="text-card-foreground">4.7% · ₹2,849 · ₹133.9/sess · 5,180 sess</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={abData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Bar dataKey="control" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Control" />
                <Bar dataKey="treatment" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Treatment" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Price History */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="font-bold text-foreground">Price History — Last 24 Hours</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                <Legend />
                {lineKeys.map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={lineColors[i % lineColors.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events feed */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" /></span>
            <h2 className="font-bold text-foreground text-sm">Real-time Events</h2>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide">
            {events.length === 0 && <p className="text-xs text-muted-foreground">Waiting for events...</p>}
            {events.map((e, i) => (
              <div key={i} className="rounded-md bg-secondary px-3 py-2 text-xs animate-fade-in">
                <span className="text-muted-foreground">{e.time}</span>
                <p className="text-card-foreground mt-0.5">{e.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
