# Panduan Instalasi OLT Huawei Registration System

## Instalasi di Debian CT (Proxmox VE)

---

## Persyaratan

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | Debian 11/12 | Debian 12 |
| RAM | 1 GB | 2 GB |
| Disk | 10 GB | 20 GB |
| CPU | 1 core | 2 core |
| Network | Akses ke OLT via Telnet (port 23) | |

---

## Langkah 1: Buat CT di Proxmox

1. Login ke **Proxmox Web UI**
2. Klik **Create CT**
3. **Template**: `debian-12-standard`
4. **Disk**: 10 GB
5. **CPU**: 2 core
6. **RAM**: 2048 MB
7. **Network**: Bridge ke jaringan yang sama dengan OLT
   - IP: sesuaikan (contoh: `192.168.210.100/24`)
   - Gateway: sesuaikan (contoh: `192.168.210.1`)
8. **Start** CT setelah dibuat

---

## Langkah 2: Update & Install Dependensi

```bash
# Login ke CT via console/SSH
apt update && apt upgrade -y

# Dependensi dasar
apt install -y curl wget git build-essential python3 python3-pip python3-venv nginx

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Yarn
npm install -g yarn
```

---

## Langkah 3: Install MongoDB

```bash
# Import GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Tambah repository
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
apt update && apt install -y mongodb-org

# Start & enable
systemctl start mongod
systemctl enable mongod

# Verifikasi
mongosh --eval "db.runCommand({ping:1})"
```

---

## Langkah 4: Copy File Aplikasi

Copy semua file dari development ke server:

```bash
mkdir -p /opt/olt-registration

# Dari komputer lokal (di luar CT):
scp -r backend/ root@<IP_CT>:/opt/olt-registration/
scp -r frontend/ root@<IP_CT>:/opt/olt-registration/
```

Struktur folder yang dibutuhkan:
```
/opt/olt-registration/
├── backend/
│   ├── server.py          # Backend utama
│   ├── olt_telnet.py      # Modul telnet OLT
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── package.json
    ├── yarn.lock
    ├── public/
    ├── src/
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── craco.config.js
    ├── jsconfig.json
    └── .env
```

---

## Langkah 5: Setup Backend

```bash
cd /opt/olt-registration/backend

# Buat virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependensi
pip install fastapi uvicorn python-dotenv pymongo pydantic motor pyjwt python-jose
```

Buat file `.env` backend:

```bash
cat > /opt/olt-registration/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=olt_registration
CORS_ORIGINS=*
JWT_SECRET=ganti-dengan-secret-key-yang-kuat
EOF
```

> **PENTING**: Ganti `JWT_SECRET` dengan string random yang kuat!

---

## Langkah 6: Setup Frontend

```bash
cd /opt/olt-registration/frontend
```

Buat file `.env` frontend (ganti `<IP_CT>` dengan IP CT Anda):

```bash
cat > /opt/olt-registration/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://<IP_CT>
EOF
```

Contoh: jika IP CT adalah `192.168.210.100`:
```
REACT_APP_BACKEND_URL=http://192.168.210.100
```

Build frontend:

```bash
yarn install
yarn build
```

---

## Langkah 7: Buat Systemd Service (Backend)

```bash
cat > /etc/systemd/system/olt-backend.service << 'EOF'
[Unit]
Description=OLT Registration Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/olt-registration/backend
Environment=PATH=/opt/olt-registration/backend/venv/bin:/usr/bin:/bin
ExecStart=/opt/olt-registration/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable olt-backend
systemctl start olt-backend
```

Verifikasi:
```bash
systemctl status olt-backend
curl http://localhost:8001/api/health
# Output: {"status":"healthy","service":"OLT Huawei Registration"}
```

---

## Langkah 8: Setup Nginx

```bash
cat > /etc/nginx/sites-available/olt-registration << 'EOF'
server {
    listen 80;
    server_name _;

    root /opt/olt-registration/frontend/build;
    index index.html;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Aktifkan site
ln -sf /etc/nginx/sites-available/olt-registration /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test & restart
nginx -t
systemctl restart nginx
systemctl enable nginx
```

---

## Langkah 9: Verifikasi

```bash
# Cek semua service
systemctl is-active mongod         # harus: active
systemctl is-active olt-backend    # harus: active
systemctl is-active nginx          # harus: active

# Test API
curl http://localhost:8001/api/health

# Test dari browser
# Buka: http://<IP_CT>
```

---

## Selesai!

1. Buka browser: `http://<IP_CT>`
2. Klik **Daftar** untuk buat akun pertama
3. **Login** dengan akun yang dibuat
4. Tambah OLT di menu **OLT Management**
5. Buat profil registrasi di **ONT Register**
6. Klik **Temukan ONT Baru** untuk scan
7. Pilih ONT + profil, lalu **Registrasi 1-Klik**

---

## Troubleshooting

### Backend tidak jalan
```bash
journalctl -u olt-backend -f
```

### MongoDB tidak jalan
```bash
journalctl -u mongod -f
```

### Nginx error
```bash
tail -f /var/log/nginx/error.log
```

### Scan ONT gagal (timeout)
```bash
# Pastikan CT bisa akses OLT
ping <IP_OLT>
telnet <IP_OLT> 23
```

### Reset database
```bash
mongosh
use olt_registration
db.dropDatabase()
```

### Update aplikasi
```bash
# Copy file baru
# Rebuild frontend:
cd /opt/olt-registration/frontend && yarn build
# Restart backend:
systemctl restart olt-backend
```

---

## Keamanan (Opsional)

### Firewall
```bash
apt install ufw
ufw allow 80/tcp
ufw allow 22/tcp
ufw enable
```

### HTTPS (jika punya domain)
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d olt.domain.com
```
