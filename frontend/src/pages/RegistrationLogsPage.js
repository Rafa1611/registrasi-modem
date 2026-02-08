import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  ClipboardList,
  Loader2,
} from "lucide-react";

export default function RegistrationLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/logs?limit=${pageSize}&skip=${page * pageSize}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error("Gagal memuat data log");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (log) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Registration Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Riwayat registrasi ONT ({total} total)</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="logs-refresh-button">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table data-testid="registration-logs-table">
                <TableHeader>
                  <TableRow className="table-header-green hover:bg-[hsl(141_64%_86%)]">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Waktu</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Operator</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">OLT</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Profil</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">ONT SN</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">F/S/P</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">ONT ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Service Port</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900 text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(10).fill(0).map((_, j) => (
                          <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse w-16"></div></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Belum ada riwayat registrasi untuk filter ini.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50">
                        <TableCell className="text-xs">{formatDate(log.registered_at)}</TableCell>
                        <TableCell className="text-sm">{log.registered_by || '-'}</TableCell>
                        <TableCell className="text-sm">{log.olt_name || '-'}</TableCell>
                        <TableCell className="text-sm">{log.profile_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.sn}</TableCell>
                        <TableCell className="font-mono text-sm">{log.fsp || '-'}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">{log.ont_id ?? '-'}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">{log.service_port_id ?? '-'}</TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                              <CheckCircle className="w-3 h-3 mr-1" /> Berhasil
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                              <XCircle className="w-3 h-3 mr-1" /> Gagal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(log)} data-testid="log-detail-button">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <p className="text-xs text-muted-foreground">
                Halaman {page + 1} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Detail Registrasi</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Waktu</p>
                  <p className="text-sm font-medium">{formatDate(selectedLog.registered_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operator</p>
                  <p className="text-sm font-medium">{selectedLog.registered_by}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">OLT</p>
                  <p className="text-sm font-medium">{selectedLog.olt_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profil</p>
                  <p className="text-sm font-medium">{selectedLog.profile_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ONT SN</p>
                  <p className="text-sm font-mono font-medium">{selectedLog.sn}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">F/S/P</p>
                  <p className="text-sm font-mono font-medium">{selectedLog.fsp}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ONT ID</p>
                  <p className="text-sm font-mono font-medium">{selectedLog.ont_id ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Service Port</p>
                  <p className="text-sm font-mono font-medium">{selectedLog.service_port_id ?? '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {selectedLog.success ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                    <CheckCircle className="w-3 h-3 mr-1" /> Berhasil
                  </Badge>
                ) : (
                  <div>
                    <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                      <XCircle className="w-3 h-3 mr-1" /> Gagal
                    </Badge>
                    {selectedLog.error && (
                      <p className="text-sm text-red-700 mt-2">{selectedLog.error}</p>
                    )}
                  </div>
                )}
              </div>

              {selectedLog.commands && selectedLog.commands.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Perintah CLI</p>
                  <div className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs font-mono space-y-1">
                    {selectedLog.commands.map((cmd, i) => (
                      <p key={i}>$ {cmd}</p>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
