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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Search,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
} from "lucide-react";

const emptyProfileForm = {
  name: "",
  olt_id: "",
  description: "",
  pon_type: "gpon",
  device_type: "hgu",
  line_profile_id: "",
  srv_profile_id: "",
  register_method: "sn",
  business_vlans: "",
  gemport: 1,
  user_vlan: "",
  priority: 0,
};

export default function ONTRegisterPage() {
  const [olts, setOlts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [discoveredOnts, setDiscoveredOnts] = useState([]);
  const [selectedOltId, setSelectedOltId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedOnts, setSelectedOnts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerResults, setRegisterResults] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [deleteProfileDialog, setDeleteProfileDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ ...emptyProfileForm });
  const [savingProfile, setSavingProfile] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [oltsRes, profilesRes] = await Promise.all([
        axios.get(`${API}/olts`),
        axios.get(`${API}/profiles`),
      ]);
      setOlts(oltsRes.data);
      setProfiles(profilesRes.data);
      if (oltsRes.data.length > 0 && !selectedOltId) {
        setSelectedOltId(oltsRes.data[0].id);
      }
    } catch (err) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const scanOnts = async () => {
    if (!selectedOltId) {
      toast.error("Pilih OLT terlebih dahulu");
      return;
    }
    setScanning(true);
    setDiscoveredOnts([]);
    setSelectedOnts(new Set());
    try {
      // Try real scan first, fallback to demo
      let res;
      try {
        res = await axios.post(`${API}/discovery/scan`, { olt_id: selectedOltId });
      } catch (scanErr) {
        // Fallback to demo scan if telnet fails
        res = await axios.post(`${API}/discovery/demo-scan`, { olt_id: selectedOltId });
        toast.info("Mode demo: OLT tidak tersedia, menampilkan data simulasi");
      }
      setDiscoveredOnts(res.data.onts || []);
      if (res.data.count === 0) {
        toast.info("Tidak ada ONT baru ditemukan");
      } else {
        toast.success(`${res.data.count} ONT ditemukan!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal scan ONT");
    } finally {
      setScanning(false);
    }
  };

  const toggleOntSelection = (index) => {
    setSelectedOnts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllOnts = () => {
    if (selectedOnts.size === discoveredOnts.length) {
      setSelectedOnts(new Set());
    } else {
      setSelectedOnts(new Set(discoveredOnts.map((_, i) => i)));
    }
  };

  const registerOnts = async () => {
    if (selectedOnts.size === 0) {
      toast.error("Pilih ONT yang akan diregistrasi");
      return;
    }
    if (!selectedProfileId) {
      toast.error("Pilih profil registrasi terlebih dahulu");
      return;
    }
    if (!selectedOltId) {
      toast.error("Pilih OLT terlebih dahulu");
      return;
    }

    setRegistering(true);
    setRegisterResults(null);

    const entries = Array.from(selectedOnts).map((idx) => {
      const ont = discoveredOnts[idx];
      return {
        sn: ont.sn,
        fsp: ont.fsp,
        description: ont.equipment_id || ont.sn_friendly || "",
      };
    });

    try {
      const res = await axios.post(`${API}/register`, {
        olt_id: selectedOltId,
        profile_id: selectedProfileId,
        ont_entries: entries,
      });
      setRegisterResults(res.data);
      setResultsDialogOpen(true);
      if (res.data.success) {
        toast.success(`${res.data.success_count} ONT berhasil diregistrasi!`);
      } else {
        toast.warning(`${res.data.success_count} berhasil, ${res.data.fail_count} gagal`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal registrasi ONT");
    } finally {
      setRegistering(false);
    }
  };

  // Profile CRUD
  const openAddProfile = () => {
    setSelectedProfile(null);
    setProfileForm({ ...emptyProfileForm, olt_id: selectedOltId || (olts[0]?.id || "") });
    setProfileDialogOpen(true);
  };

  const openEditProfile = (profile) => {
    setSelectedProfile(profile);
    setProfileForm({
      name: profile.name || "",
      olt_id: profile.olt_id || "",
      description: profile.description || "",
      pon_type: profile.pon_type || "gpon",
      device_type: profile.device_type || "hgu",
      line_profile_id: profile.line_profile_id || "",
      srv_profile_id: profile.srv_profile_id || "",
      register_method: profile.register_method || "sn",
      business_vlans: profile.business_vlans || "",
      gemport: profile.gemport || 1,
      user_vlan: profile.user_vlan || "",
      priority: profile.priority || 0,
    });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        ...profileForm,
        line_profile_id: parseInt(profileForm.line_profile_id) || 0,
        srv_profile_id: parseInt(profileForm.srv_profile_id) || 0,
        gemport: parseInt(profileForm.gemport) || 1,
        user_vlan: profileForm.user_vlan ? parseInt(profileForm.user_vlan) : null,
        priority: parseInt(profileForm.priority) || 0,
      };
      if (selectedProfile) {
        await axios.put(`${API}/profiles/${selectedProfile.id}`, payload);
        toast.success("Profil berhasil diperbarui");
      } else {
        await axios.post(`${API}/profiles`, payload);
        toast.success("Profil berhasil dibuat");
      }
      setProfileDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menyimpan profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      await axios.delete(`${API}/profiles/${selectedProfile.id}`);
      toast.success("Profil berhasil dihapus");
      setDeleteProfileDialog(false);
      fetchData();
    } catch (err) {
      toast.error("Gagal menghapus profil");
    }
  };

  const filteredProfiles = selectedOltId
    ? profiles.filter((p) => p.olt_id === selectedOltId || !p.olt_id)
    : profiles;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">ONT Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Registrasi ONT ke OLT Huawei</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Pilih OLT:</Label>
          <Select value={selectedOltId} onValueChange={setSelectedOltId}>
            <SelectTrigger className="w-[240px]" data-testid="ont-olt-select">
              <SelectValue placeholder="Pilih OLT" />
            </SelectTrigger>
            <SelectContent>
              {olts.map((olt) => (
                <SelectItem key={olt.id} value={olt.id}>
                  {olt.name} ({olt.ip_address})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ONT Register Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">ONT Register Profile</CardTitle>
            <Button size="sm" variant="outline" onClick={openAddProfile} data-testid="profile-add-button">
              <Plus className="w-4 h-4 mr-1" /> Profil Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table data-testid="ont-profiles-table">
                <TableHeader>
                  <TableRow className="table-header-green hover:bg-[hsl(141_64%_86%)]">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900 w-10">ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Nama</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">OLT IP</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">PON/Device Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Line/Service Profile</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Register Method</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Business VLAN</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Belum ada profil. Buat profil registrasi untuk mempercepat provisioning.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile, idx) => (
                      <TableRow key={profile.id} className="hover:bg-slate-50">
                        <TableCell className="text-sm tabular-nums">{idx + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{profile.name}</p>
                            <p className="text-xs text-muted-foreground">{profile.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{profile.olt_ip || '-'}</TableCell>
                        <TableCell className="text-sm">{profile.pon_type}/{profile.device_type}</TableCell>
                        <TableCell className="font-mono text-sm">{profile.line_profile_id}/{profile.srv_profile_id}</TableCell>
                        <TableCell className="text-sm">{profile.register_method}</TableCell>
                        <TableCell>
                          {profile.business_vlans ? (
                            <span className="font-mono text-xs text-blue-700 font-medium">{profile.business_vlans}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <CheckCircle className="w-3 h-3 mr-1" /> Active
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProfile(profile)} data-testid="profile-edit-button">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedProfile(profile); setDeleteProfileDialog(true); }} data-testid="profile-delete-button">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

      {/* ONT Automatic Discovery Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">ONT Automatic Discovery</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[220px]" data-testid="ont-profile-select">
                  <SelectValue placeholder="== Pilih Profil Registrasi ==" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={registerOnts}
                disabled={registering || selectedOnts.size === 0 || !selectedProfileId}
                className="bg-[hsl(var(--primary))]"
                data-testid="ont-one-click-register-button"
              >
                {registering ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                Registrasi 1-Klik
              </Button>
              <Button
                onClick={scanOnts}
                disabled={scanning || !selectedOltId}
                variant="secondary"
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                data-testid="ont-discovery-scan-button"
              >
                {scanning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                Temukan ONT Baru
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Scanning Overlay */}
          {scanning && (
            <div className="px-6 py-4 border-b bg-blue-50">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Menjalankan perintah ke OLT... (10-30 detik)</p>
                  <p className="text-xs text-blue-600">display ont autofind all</p>
                </div>
              </div>
              <Progress className="mt-2" value={undefined} data-testid="telnet-operation-progress" />
            </div>
          )}

          {/* Registering Overlay */}
          {registering && (
            <div className="px-6 py-4 border-b bg-amber-50">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Mendaftarkan ONT... Mohon tunggu</p>
                  <p className="text-xs text-amber-600">Mengirim perintah registrasi ke OLT</p>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="w-full">
            <div className="min-w-[1000px]">
              <Table data-testid="ont-discovery-table">
                <TableHeader>
                  <TableRow className="table-header-green hover:bg-[hsl(141_64%_86%)]">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900 w-10">
                      <Checkbox
                        checked={discoveredOnts.length > 0 && selectedOnts.size === discoveredOnts.length}
                        onCheckedChange={selectAllOnts}
                        data-testid="ont-select-all"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">No</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Frame/Board/Port</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">ONT SN</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Vendor ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">ONT Model</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">ONT Version</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Software Version</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Discovery Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discoveredOnts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {scanning ? "Sedang mencari ONT..." : 'Belum ada ONT baru. Klik "Temukan ONT Baru" untuk scan.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    discoveredOnts.map((ont, idx) => (
                      <TableRow
                        key={idx}
                        className={`hover:bg-slate-50 cursor-pointer ${selectedOnts.has(idx) ? 'bg-emerald-50' : ''}`}
                        onClick={() => toggleOntSelection(idx)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedOnts.has(idx)}
                            onCheckedChange={() => toggleOntSelection(idx)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{ont.number || idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-medium">{ont.fsp}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm font-medium">{ont.sn}</p>
                            {ont.sn_friendly && <p className="text-xs text-muted-foreground">{ont.sn_friendly}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{ont.vendor_id || '-'}</TableCell>
                        <TableCell className="text-sm">{ont.equipment_id || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{ont.ont_version || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{ont.software_version || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ont.autofind_time || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {discoveredOnts.length > 0 && (
            <div className="px-4 py-3 border-t flex items-center justify-between bg-slate-50">
              <p className="text-xs text-muted-foreground">
                {selectedOnts.size} dari {discoveredOnts.length} ONT dipilih
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllOnts} className="text-xs">
                  {selectedOnts.size === discoveredOnts.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Add/Edit Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedProfile ? "Ubah Profil" : "Profil Registrasi Baru"}</DialogTitle>
            <DialogDescription>Konfigurasi profil untuk registrasi ONT</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Profil</Label>
                <Input data-testid="profile-form-name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="VLAN40" required />
              </div>
              <div className="space-y-2">
                <Label>OLT</Label>
                <Select value={profileForm.olt_id} onValueChange={(v) => setProfileForm({ ...profileForm, olt_id: v })}>
                  <SelectTrigger data-testid="profile-form-olt">
                    <SelectValue placeholder="Pilih OLT" />
                  </SelectTrigger>
                  <SelectContent>
                    {olts.map((olt) => (
                      <SelectItem key={olt.id} value={olt.id}>{olt.name} ({olt.ip_address})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input data-testid="profile-form-desc" value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="Deskripsi profil" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>PON Type</Label>
                <Select value={profileForm.pon_type} onValueChange={(v) => setProfileForm({ ...profileForm, pon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpon">GPON</SelectItem>
                    <SelectItem value="epon">EPON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Device Type</Label>
                <Select value={profileForm.device_type} onValueChange={(v) => setProfileForm({ ...profileForm, device_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hgu">HGU</SelectItem>
                    <SelectItem value="sfu">SFU</SelectItem>
                    <SelectItem value="mdu">MDU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Register Method</Label>
                <Select value={profileForm.register_method} onValueChange={(v) => setProfileForm({ ...profileForm, register_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sn">SN Auth</SelectItem>
                    <SelectItem value="password">Password</SelectItem>
                    <SelectItem value="loid">LOID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Line Profile ID</Label>
                <Input data-testid="profile-form-line" type="number" value={profileForm.line_profile_id} onChange={(e) => setProfileForm({ ...profileForm, line_profile_id: e.target.value })} placeholder="15" required />
              </div>
              <div className="space-y-2">
                <Label>Service Profile ID</Label>
                <Input data-testid="profile-form-srv" type="number" value={profileForm.srv_profile_id} onChange={(e) => setProfileForm({ ...profileForm, srv_profile_id: e.target.value })} placeholder="15" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Business VLAN</Label>
                <Input data-testid="profile-form-vlan" value={profileForm.business_vlans} onChange={(e) => setProfileForm({ ...profileForm, business_vlans: e.target.value })} placeholder="40" />
              </div>
              <div className="space-y-2">
                <Label>GemPort</Label>
                <Input type="number" value={profileForm.gemport} onChange={(e) => setProfileForm({ ...profileForm, gemport: e.target.value })} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>User VLAN</Label>
                <Input type="number" value={profileForm.user_vlan} onChange={(e) => setProfileForm({ ...profileForm, user_vlan: e.target.value })} placeholder="Sama dgn VLAN" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input type="number" value={profileForm.priority} onChange={(e) => setProfileForm({ ...profileForm, priority: e.target.value })} placeholder="0" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={savingProfile} data-testid="profile-form-save">
                {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedProfile ? "Perbarui" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Profile Confirmation */}
      <AlertDialog open={deleteProfileDialog} onOpenChange={setDeleteProfileDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus profil "{selectedProfile?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile} className="bg-red-600 hover:bg-red-700" data-testid="profile-confirm-delete">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Registration Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Hasil Registrasi</DialogTitle>
            <DialogDescription>
              {registerResults && (
                <span>{registerResults.success_count} berhasil, {registerResults.fail_count} gagal dari {registerResults.total} ONT</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {registerResults && (
            <div className="space-y-3">
              {registerResults.results.map((r, i) => (
                <div key={i} className={`p-4 rounded-lg border ${r.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {r.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    <span className="font-mono text-sm font-medium">{r.sn}</span>
                    <span className="text-xs text-muted-foreground">F/S/P: {r.fsp}</span>
                  </div>
                  {r.success && (
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">ONT ID:</span> <span className="font-mono">{r.ont_id}</span></p>
                      <p><span className="font-medium">Service Port:</span> <span className="font-mono">{r.service_port_id}</span></p>
                    </div>
                  )}
                  {r.error && (
                    <p className="text-xs text-red-700 mt-1">{r.error}</p>
                  )}
                  {r.commands && r.commands.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Lihat perintah CLI</summary>
                      <div className="mt-1 p-2 bg-gray-900 text-green-400 rounded text-xs font-mono space-y-1 max-h-[200px] overflow-y-auto">
                        {r.commands.map((cmd, ci) => (
                          <p key={ci}>{cmd}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultsDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
