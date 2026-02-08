import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import {
  LayoutDashboard,
  Server,
  FileText,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Dashboard", route: "/", icon: LayoutDashboard, testId: "nav-dashboard" },
  { label: "OLT Management", route: "/olts", icon: Server, testId: "nav-olt-management" },
  { label: "ONT Register", route: "/ont-register", icon: FileText, testId: "nav-ont-register" },
  { label: "Registration Logs", route: "/logs", icon: ClipboardList, testId: "nav-registration-logs" },
];

function Sidebar({ collapsed, onToggle, mobile = false }) {
  const location = useLocation();

  return (
    <div className={`flex flex-col h-full sidebar-bg text-white ${mobile ? 'w-[260px]' : collapsed ? 'w-[72px]' : 'w-[260px]'} transition-all duration-200`}>
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <h1 className="font-heading text-sm font-semibold whitespace-nowrap">OLT Registration</h1>
            <p className="text-[11px] text-white/50">Huawei MA5600</p>
          </div>
        )}
        {!mobile && (
          <button
            onClick={onToggle}
            className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
            data-testid="sidebar-toggle"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {(!collapsed || mobile) && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Application</p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.route;
          const Icon = item.icon;
          return (
            <Link
              key={item.route}
              to={item.route}
              data-testid={item.testId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
                ${isActive
                  ? 'bg-white/15 text-white font-medium border-l-2 border-emerald-400'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
                }
                ${collapsed && !mobile ? 'justify-center' : ''}
              `}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentPage = navItems.find((n) => n.route === location.pathname);

  return (
    <div className="flex h-screen bg-[hsl(var(--background))]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="header-gradient h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0" data-testid="header">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[260px] border-none">
                <Sidebar mobile />
              </SheetContent>
            </Sheet>

            <div className="text-white">
              <h2 className="font-heading text-sm font-semibold">{currentPage?.label || 'Dashboard'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-white/90 hover:text-white transition-colors" data-testid="header-user-menu">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm hidden sm:inline">{user?.username || 'User'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout} data-testid="logout-button">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
