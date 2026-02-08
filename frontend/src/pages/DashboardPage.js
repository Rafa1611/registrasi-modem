import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, FileText, ClipboardList, CheckCircle, XCircle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/dashboard/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = stats
    ? [
        { label: "Total OLT", value: stats.total_olts, icon: Server, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Profil Registrasi", value: stats.total_profiles, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Total Registrasi", value: stats.total_registrations, icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Registrasi Hari Ini", value: stats.today_registrations, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview sistem registrasi OLT Huawei</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
                      <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                    </div>
                    <p className="font-heading text-3xl font-bold tabular-nums">{kpi.value}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Success/Fail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Statistik Registrasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">Berhasil</span>
                </div>
                <span className="font-heading font-bold text-emerald-600 tabular-nums">{stats.success_registrations}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Gagal</span>
                </div>
                <span className="font-heading font-bold text-red-500 tabular-nums">{stats.failed_registrations}</span>
              </div>
              {stats.total_registrations > 0 && (
                <div className="pt-2 border-t">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.success_registrations / stats.total_registrations * 100).toFixed(0)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Success rate: {(stats.success_registrations / stats.total_registrations * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Registrasi Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recent_logs && stats.recent_logs.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_logs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {log.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span className="font-mono text-xs">{log.sn?.substring(0, 16) || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{log.registered_by}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.olt_name || '-'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada riwayat registrasi</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
