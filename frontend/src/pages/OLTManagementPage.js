import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
  Server,
  RefreshCw,
} from "lucide-react";

const OLT_VERSIONS = [
  "MA5600V800R015C00 / SPC100",
  "MA5600V800R018C00 / SPH210",
];

const emptyForm = {
  name: "",
  ip_address: "",
  port: 23,
  username: "",
  password: "",
  description: "",
  olt_version: OLT_VERSIONS[1],
};

export default function OLTManagementPage() {
  const [olts, setOlts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOlt, setSelectedOlt] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    fetchOlts();
  }, []);

  const fetchOlts = async () => {
    try {
      const res = await axios.get(`${API}/olts`);
      setOlts(res.data);
    } catch (err) {
      toast.error("Gagal memuat data OLT");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setSelectedOlt(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (olt) => {
    setSelectedOlt(olt);
    setForm({
      name: olt.name || "",
      ip_address: olt.ip_address || "",
      port: olt.port || 23,
      username: olt.username || "",
      password: "",
      description: olt.description || "",
      olt_version: olt.olt_version || OLT_VERSIONS[1],
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedOlt) {
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;
        await axios.put(`${API}/olts/${selectedOlt.id}`, updateData);
        toast.success("OLT berhasil diperbarui");
      } else {
        await axios.post(`${API}/olts`, form);
        toast.success("OLT berhasil ditambahkan");
      }
      setDialogOpen(false);
      fetchOlts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menyimpan OLT");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOlt) return;
    try {
      await axios.delete(`${API}/olts/${selectedOlt.id}`);
      toast.success("OLT berhasil dihapus");
      setDeleteDialogOpen(false);
      fetchOlts();
    } catch (err) {
      toast.error("Gagal menghapus OLT");
    }
  };

  const testConnection = async (olt) => {
    setTesting(olt.id);
    try {
      const res = await axios.post(`${API}/olts/${olt.id}/test`);
      if (res.data.success) {
        toast.success(res.data.message || "Koneksi berhasil!");
      } else {
        toast.error(res.data.message || "Koneksi gagal");
      }
      fetchOlts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menguji koneksi");
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100" data-testid="status-connected-badge"><Wifi className="w-3 h-3 mr-1" />Connected</Badge>;
      case "disconnected":
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100" data-testid="status-disconnected-badge"><WifiOff className="w-3 h-3 mr-1" />Disconnected</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100"><WifiOff className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">OLT Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola koneksi OLT Huawei</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOlts} data-testid="olt-refresh-button">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd} data-testid="olt-add-button">
            <Plus className="w-4 h-4 mr-1" /> Tambah OLT
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <Table data-testid="olt-table">
                <TableHeader>
                  <TableRow className="table-header-green hover:bg-[hsl(141_64%_86%)]">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Nama</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">IP Address</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Port</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Username</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Versi OLT</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Deskripsi</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(8).fill(0).map((_, j) => (
                          <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse w-20"></div></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : olts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Server className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm">Belum ada OLT. Klik "Tambah OLT" untuk menambahkan.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    olts.map((olt) => (
                      <TableRow key={olt.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-sm">{olt.name}</TableCell>
                        <TableCell className="font-mono text-sm">{olt.ip_address}</TableCell>
                        <TableCell className="font-mono text-sm">{olt.port}</TableCell>
                        <TableCell className="text-sm">{olt.username}</TableCell>
                        <TableCell className="text-xs">{olt.olt_version}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{olt.description}</TableCell>
                        <TableCell>{getStatusBadge(olt.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => testConnection(olt)}
                                    disabled={testing === olt.id}
                                    data-testid="olt-row-test-button"
                                  >
                                    {testing === olt.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Wifi className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Uji Koneksi</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(olt)} data-testid="olt-row-edit-button">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ubah</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedOlt(olt); setDeleteDialogOpen(true); }} data-testid="olt-row-delete-button">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedOlt ? "Ubah OLT" : "Tambah OLT"}</DialogTitle>
            <DialogDescription>
              {selectedOlt ? "Perbarui informasi koneksi OLT" : "Tambahkan koneksi OLT baru"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama OLT</Label>
                <Input
                  data-testid="olt-form-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="OLT Huawei Baru"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>IP Address</Label>
                <Input
                  data-testid="olt-form-ip"
                  value={form.ip_address}
                  onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                  placeholder="192.168.210.4"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Port Telnet</Label>
                <Input
                  data-testid="olt-form-port"
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 23 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Versi OLT</Label>
                <Select value={form.olt_version} onValueChange={(v) => setForm({ ...form, olt_version: v })}>
                  <SelectTrigger data-testid="olt-form-version">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OLT_VERSIONS.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  data-testid="olt-form-username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password {selectedOlt && <span className="text-xs text-muted-foreground">(kosongkan jika tidak diubah)</span>}</Label>
                <Input
                  data-testid="olt-form-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Password"
                  required={!selectedOlt}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                data-testid="olt-form-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi OLT (opsional)"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} data-testid="olt-form-save">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedOlt ? "Perbarui" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus OLT?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus OLT "{selectedOlt?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="olt-confirm-delete">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
