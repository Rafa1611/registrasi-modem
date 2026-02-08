{
  "design_system_name": "OLT Huawei Registration System (ITMS-style Dashboard)",
  "brand_attributes": {
    "personality": [
      "professional",
      "technical",
      "trustworthy",
      "fast-scanning (ops-friendly)",
      "low-fatigue for long sessions"
    ],
    "tone_of_voice": {
      "language": "Bahasa Indonesia (ops UI) + technical terms in English",
      "style": "short labels, explicit verbs for actions, no slang",
      "examples": {
        "good": [
          "Uji Koneksi",
          "Temukan ONT Baru",
          "Registrasi 1-Klik",
          "Profil Registrasi"
        ],
        "avoid": [
          "Yuk coba!",
          "Magic",
          "Auto-fix"
        ]
      }
    }
  },

  "information_architecture": {
    "global_layout": {
      "pattern": "left-sidebar + top header + scrollable content",
      "content_width": "fluid; max-w-[1400px] only for very wide screens; otherwise full",
      "density_mode": "compact by default (tables), with optional Comfortable toggle later",
      "primary_success_actions": [
        "Scan unregistered ONTs",
        "Select registration profile",
        "1-click register",
        "Verify service-port + logs"
      ]
    },
    "nav_items": [
      { "label": "Dashboard", "route": "/", "data-testid": "nav-dashboard" },
      { "label": "OLT Management", "route": "/olts", "data-testid": "nav-olt-management" },
      { "label": "ONT Register", "route": "/ont-register", "data-testid": "nav-ont-register" },
      { "label": "Registration Logs", "route": "/logs", "data-testid": "nav-registration-logs" },
      { "label": "Settings", "route": "/settings", "data-testid": "nav-settings" }
    ],
    "top_header": {
      "left": ["App name", "active OLT chip (optional)", "breadcrumb"],
      "right": ["connection status pill", "notifications (optional)", "user menu"],
      "data-testid": {
        "user_menu": "header-user-menu",
        "connection_status": "header-connection-status"
      }
    }
  },

  "inspiration_references": {
    "style_targets": [
      {
        "name": "Dribbble: Proxy Dashboard (network management)",
        "url": "https://dribbble.com/shots/26995930-Proxy-Dashboard-Design-Analytics-Network-Management-UI",
        "what_to_borrow": [
          "clear sidebar grouping",
          "top header KPI strip",
          "clean table rhythm + subtle dividers"
        ]
      },
      {
        "name": "Dribbble search: network monitoring dashboard",
        "url": "https://dribbble.com/search/network-monitoring-dashboard",
        "what_to_borrow": [
          "status color semantics",
          "dense tables with sticky headers",
          "inline actions per row"
        ]
      }
    ],
    "layout_fusion": "ALLinPOI ITMS-like density + modern shadcn surfaces + mild blue header + light green table headers + quiet gray app background"
  },

  "typography": {
    "google_fonts": {
      "heading_font": {
        "name": "Space Grotesk",
        "weights": [500, 600, 700],
        "usage": "page titles, section headers, KPI numbers"
      },
      "body_font": {
        "name": "Inter",
        "weights": [400, 500, 600],
        "usage": "tables, forms, helper text"
      },
      "mono_font_optional": {
        "name": "IBM Plex Mono",
        "weights": [400, 500],
        "usage": "serial numbers (ONT SN), IPs, ports, service-port ids"
      },
      "implementation_note_js": "Add <link> tags in public/index.html or import via CSS in src/index.css (JS project; no TSX-specific instructions)."
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "page_title": "text-2xl sm:text-3xl font-semibold tracking-tight",
      "section_title": "text-sm font-semibold uppercase tracking-wide",
      "table": {
        "header": "text-xs font-semibold uppercase tracking-wide",
        "cell": "text-sm",
        "dense_cell": "text-[13px]"
      },
      "small": "text-xs text-muted-foreground"
    },
    "numeric_formatting": {
      "kpi": "tabular-nums",
      "tables": "tabular-nums",
      "sn_ip": "font-mono"
    }
  },

  "color_system": {
    "notes": [
      "Match user constraint: blue header, white content, light green table headers.",
      "Keep gradients minimal (<20% viewport) and only as subtle header/backdrop accents."
    ],
    "tokens_css_variables": {
      "location": "/app/frontend/src/index.css (:root)",
      "recommended_hsl_tokens": {
        "background": "210 20% 98%",
        "foreground": "222 47% 11%",

        "card": "0 0% 100%",
        "card-foreground": "222 47% 11%",

        "popover": "0 0% 100%",
        "popover-foreground": "222 47% 11%",

        "primary": "214 86% 36%",
        "primary-foreground": "0 0% 100%",

        "secondary": "210 20% 96%",
        "secondary-foreground": "222 47% 11%",

        "muted": "210 16% 94%",
        "muted-foreground": "215 16% 40%",

        "accent": "210 18% 92%",
        "accent-foreground": "222 47% 11%",

        "border": "214 20% 88%",
        "input": "214 20% 88%",
        "ring": "214 86% 45%",

        "success": "142 72% 32%",
        "success-foreground": "0 0% 100%",

        "warning": "38 92% 50%",
        "warning-foreground": "222 47% 11%",

        "destructive": "0 84% 56%",
        "destructive-foreground": "0 0% 100%"
      },
      "hex_reference": {
        "header_blue": "#103766",
        "header_blue_2": "#003459",
        "table_header_green": "#C6F4D6",
        "app_bg": "#F6F8FB",
        "text": "#0F172A",
        "muted_text": "#475569",
        "border": "#D7E0EA",
        "danger": "#DC2626",
        "warning": "#F59E0B",
        "success": "#16A34A"
      }
    },
    "semantic_usage": {
      "top_header": {
        "bg": "header_blue (#103766)",
        "text": "white",
        "icons": "white/80",
        "bottom_border": "1px solid rgba(255,255,255,0.12)"
      },
      "sidebar": {
        "bg": "#0B2A4A (slightly darker than header)",
        "active_item": "bg-white/10 + left indicator in table_header_green",
        "text": "white/85",
        "muted": "white/60"
      },
      "content": {
        "bg": "app_bg (#F6F8FB)",
        "cards": "white",
        "tables": "white surfaces with subtle borders"
      },
      "table_headers": {
        "bg": "table_header_green (#C6F4D6)",
        "text": "#134E2A",
        "sticky": true
      },
      "status_colors": {
        "connected": "success",
        "disconnected": "destructive",
        "pending": "warning",
        "running_telnet": "primary"
      }
    },
    "gradients_and_texture": {
      "allowed_usage": [
        "Very subtle header backdrop sheen",
        "Hero strip on login only (small area)",
        "Decorative 1-2px top borders"
      ],
      "safe_gradient_examples": [
        "linear-gradient(90deg, rgba(16,55,102,1) 0%, rgba(10,42,74,1) 55%, rgba(16,55,102,1) 100%)",
        "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 45%)"
      ],
      "noise_overlay": {
        "how": "Add a pseudo-element on header or app background",
        "css_snippet": ".noise:before{content:'';position:absolute;inset:0;background-image:url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.06\"/%3E%3C/svg%3E');mix-blend-mode:overlay;pointer-events:none;}",
        "restriction": "Apply only to large backgrounds; keep opacity <= 0.06"
      }
    }
  },

  "spacing_grid": {
    "layout_grid": {
      "desktop": "sidebar w-[260px] (collapsible to icons at w-[72px]) + content flex-1",
      "content_padding": "p-4 sm:p-6",
      "card_spacing": "gap-4 sm:gap-6",
      "table_spacing": "dense rows; py-2 in cells, header py-2.5"
    },
    "responsive_rules": [
      "Mobile: sidebar becomes Sheet (hamburger) + header stays sticky",
      "Tables: horizontal scroll with ScrollArea + sticky first column for key identifiers",
      "Use Resizable panels on desktop for ONT Register page (profiles left, discovery right)"
    ]
  },

  "components": {
    "shadcn_primary_components": {
      "paths": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/label.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/alert-dialog.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/resizable.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ]
    },

    "page_level_templates": {
      "login": {
        "layout": "split or centered card (not globally centered app); show brand strip + help text",
        "components": ["Card", "Form", "Input", "Button", "Alert"],
        "states": ["invalid credentials", "loading"],
        "data-testid": {
          "email": "login-email-input",
          "password": "login-password-input",
          "submit": "login-submit-button",
          "error": "login-error-message"
        }
      },
      "dashboard_home": {
        "layout": "KPI cards row + recent registrations table",
        "components": ["Card", "Badge", "Table", "Tabs"],
        "kpis": ["OLT Connected", "Unregistered ONT Found", "Registrations Today", "Errors (24h)"],
        "charts_optional": "Recharts small sparkline per KPI (optional)"
      },
      "olt_management": {
        "layout": "table-first + toolbar with Add OLT + Test Connection",
        "components": ["Table", "Dialog", "Input", "Button", "Badge", "Tooltip"],
        "row_actions": ["Edit", "Delete", "Test"],
        "data-testid_examples": {
          "add": "olt-add-button",
          "test": "olt-test-connection-button",
          "table": "olt-table",
          "row_test": "olt-row-test-button"
        }
      },
      "ont_register": {
        "layout": "two-panel resizable: left=Profiles, right=Auto-Discovery; sticky action bar",
        "components": ["Resizable", "Table", "Select", "Button", "Badge", "ScrollArea"],
        "actions": {
          "find_new": "Temukan ONT Baru",
          "register": "Registrasi 1-Klik",
          "profile_select": "Select (Profil Registrasi)"
        },
        "table_requirements": [
          "sticky header (light green)",
          "row hover highlight",
          "selected row state",
          "inline badges for PON type / status"
        ],
        "data-testid": {
          "find_new": "ont-discovery-scan-button",
          "register": "ont-one-click-register-button",
          "profile_select": "ont-profile-select",
          "profiles_table": "ont-profiles-table",
          "discovery_table": "ont-discovery-table"
        }
      },
      "registration_logs": {
        "layout": "filters row (date range, user, OLT) + logs table",
        "components": ["Table", "Calendar", "Popover", "Input", "Select", "Badge"],
        "data-testid": {
          "table": "registration-logs-table",
          "filter_date": "logs-filter-date",
          "filter_user": "logs-filter-user"
        }
      }
    },

    "table_design_spec": {
      "base": {
        "container": "rounded-lg border bg-white",
        "header": "sticky top-0 bg-[var(--table-header)] (use token) border-b",
        "row": "hover:bg-slate-50 data-[state=selected]:bg-emerald-50",
        "cell": "py-2 px-3 align-middle",
        "dense": "text-[13px]",
        "horizontal_scroll": "wrap with <ScrollArea className='w-full'> and <div className='min-w-[1100px]'>"
      },
      "columns": {
        "monospace": ["IP", "Port", "ONT SN", "service-port", "frame/slot/port"],
        "truncate": "use max-w + truncate with Tooltip on hover",
        "row_actions": "right aligned; use ghost buttons with icons"
      },
      "table_header_green_token": {
        "recommended_css": "--table-header: 141 64% 86% (HSL close to #C6F4D6)",
        "usage": "bg-[hsl(var(--table-header))]"
      }
    },

    "buttons": {
      "style": "Professional / Corporate",
      "radii": "rounded-md (8px)",
      "variants": {
        "primary": {
          "use": "register / scan / save",
          "class": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
          "data-testid_rule": "Always add data-testid on Button components"
        },
        "secondary": {
          "use": "test connection / refresh",
          "class": "bg-slate-100 text-slate-900 hover:bg-slate-200"
        },
        "destructive": {
          "use": "delete",
          "class": "bg-red-600 text-white hover:bg-red-700"
        },
        "ghost": {
          "use": "row actions",
          "class": "hover:bg-slate-100"
        }
      },
      "micro_interaction": {
        "hover": "translate-y-[-1px] only for primary CTAs (not all buttons)",
        "press": "active:translate-y-0 active:scale-[0.98]",
        "loading": "replace icon with spinner + disable"
      }
    },

    "status_badges": {
      "use_component": "/app/frontend/src/components/ui/badge.jsx",
      "patterns": [
        { "status": "Connected", "class": "bg-emerald-100 text-emerald-800 border-emerald-200", "data-testid": "status-connected-badge" },
        { "status": "Disconnected", "class": "bg-red-100 text-red-800 border-red-200", "data-testid": "status-disconnected-badge" },
        { "status": "Running", "class": "bg-blue-100 text-blue-800 border-blue-200", "data-testid": "status-running-badge" }
      ]
    }
  },

  "motion_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "use_cases": [
        "page transitions (fade/slide 10-14px)",
        "table row selection highlight",
        "loading overlays for telnet operations",
        "sidebar collapse animation"
      ]
    },
    "principles": {
      "duration": {
        "fast": "120-160ms",
        "base": "180-220ms",
        "slow": "300-450ms (only for long async states)"
      },
      "easing": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "dont": ["Do not use transition: all"],
      "async_telnet_pattern": {
        "pattern": "sticky action bar shows progress + inline log tail (last 3 lines)",
        "components": ["Progress", "Skeleton", "Sonner toast"],
        "copy": {
          "running": "Menjalankan perintah ke OLT… (10–30 detik)",
          "success": "Registrasi berhasil.",
          "fail": "Registrasi gagal. Periksa kredensial/port/telnet."
        },
        "data-testid": {
          "overlay": "telnet-operation-overlay",
          "progress": "telnet-operation-progress"
        }
      }
    }
  },

  "data_visualization_optional": {
    "library": {
      "name": "recharts",
      "install": "npm i recharts",
      "use": "tiny uptime/registration trend chart on Dashboard only (keep subtle)"
    },
    "chart_style": {
      "stroke": "hsl(var(--primary))",
      "grid": "stroke-slate-200",
      "tooltip": "shadcn Tooltip/Popover style"
    }
  },

  "accessibility": {
    "wcag": "Aim AA",
    "focus": "Always show focus-visible ring; do not remove outlines",
    "tables": [
      "Ensure header cells use <th> semantics (shadcn Table supports)",
      "Provide aria-label for icon-only buttons",
      "Avoid color-only status; pair badge text + icon"
    ],
    "language": {
      "labels": "Bahasa Indonesia",
      "technical_terms": "Keep ONT/OLT/PON/service-port in English"
    }
  },

  "iconography": {
    "library": "lucide-react (preferred)",
    "rules": [
      "No emoji icons",
      "Use consistent 18-20px in tables, 20-24px in header",
      "Icon-only buttons must have Tooltip"
    ]
  },

  "image_urls": {
    "note": "This is a utilitarian dashboard; keep imagery minimal. Prefer subtle abstract/network SVG background only on login.",
    "login_background_optional": [
      {
        "category": "login",
        "description": "Abstract network/cables background for the left strip or header band (very subtle, low contrast)",
        "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=60"
      }
    ]
  },

  "content_copy_guidelines": {
    "table_toolbar": {
      "scan": "Temukan ONT Baru",
      "register": "Registrasi 1-Klik",
      "test": "Uji Koneksi",
      "add": "Tambah OLT",
      "edit": "Ubah",
      "delete": "Hapus"
    },
    "empty_states": {
      "profiles": "Belum ada profil. Buat profil registrasi untuk mempercepat provisioning.",
      "discovery": "Belum ada ONT baru. Klik \"Temukan ONT Baru\" untuk scan.",
      "logs": "Belum ada riwayat registrasi untuk filter ini."
    }
  },

  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid (kebab-case).",
    "apply_to": [
      "Buttons",
      "Links",
      "Inputs",
      "Select triggers",
      "Dialog open/close",
      "Table row action buttons",
      "Connection status indicators",
      "Error/success banners",
      "Loading overlays"
    ]
  },

  "instructions_to_main_agent": [
    "Replace default CRA App.css centered demo styling; do not keep .App-header centering patterns.",
    "Implement a shared <AppShell> layout (Header + Sidebar + Content). Sidebar collapses on desktop; on mobile use shadcn Sheet.",
    "Define new CSS variables in index.css for header blue and table-header green (token --table-header) and update shadcn tokens to match this light theme.",
    "Build dense tables with sticky headers, horizontal ScrollArea, and row selection states for ONT profile/discovery selection.",
    "Use Sonner for operation toasts. Add a long-running Telnet overlay pattern with Progress + last command log snippet.",
    "Use lucide-react icons (no emojis).",
    "Ensure every button/input/select/row-action includes data-testid (kebab-case).",
    "Use JS files only; keep component exports consistent with current project conventions."
  ],

  "component_path": {
    "shadcn": "/app/frontend/src/components/ui/",
    "key_files": [
      "button.jsx",
      "table.jsx",
      "sheet.jsx",
      "resizable.jsx",
      "scroll-area.jsx",
      "select.jsx",
      "dialog.jsx",
      "sonner.jsx",
      "skeleton.jsx",
      "progress.jsx"
    ]
  },

  "General_UI_UX_Design_Guidelines": "    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
