import { useState } from "react";
import { useAuth, API } from "@/App";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister
        ? { username: form.username, password: form.password, full_name: form.full_name }
        : { username: form.username, password: form.password };

      const res = await axios.post(`${API}${endpoint}`, payload);
      login(res.data.token, res.data.user);
      toast.success(isRegister ? "Registrasi berhasil!" : "Login berhasil!");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Terjadi kesalahan";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-[480px] header-gradient flex-col justify-between p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-white">OLT Registration</h1>
              <p className="text-white/50 text-xs">Huawei MA5600 Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Registrasi ONT<br />Lebih Cepat & Mudah</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Web-based interface untuk menggantikan CLI OLT.
            Auto-discovery, 1-click registration, dan logging lengkap.
          </p>

          <div className="mt-8 space-y-3">
            {["Auto-detect ONT ID & Service Port", "1-Click Registration", "Registration Logging"].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs relative z-10">
          Huawei MA5600 V800R015/R018
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[hsl(var(--background))]">
        <Card className="w-full max-w-[420px] shadow-lg border-[hsl(var(--border))]">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-sm">OLT Registration</span>
            </div>
            <CardTitle className="font-heading text-xl">
              {isRegister ? "Buat Akun Baru" : "Login"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Daftar untuk mengakses sistem registrasi OLT"
                : "Masuk ke sistem registrasi OLT Huawei"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap</Label>
                  <Input
                    id="full_name"
                    data-testid="register-fullname-input"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Nama lengkap"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="login-email-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md" data-testid="login-error-message">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isRegister ? "Daftar" : "Login"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {isRegister ? (
                  <p>
                    Sudah punya akun?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(false); setError(""); }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline"
                      data-testid="switch-to-login"
                    >
                      Login
                    </button>
                  </p>
                ) : (
                  <p>
                    Belum punya akun?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(true); setError(""); }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline"
                      data-testid="switch-to-register"
                    >
                      Daftar
                    </button>
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
