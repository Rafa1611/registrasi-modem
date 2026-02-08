# Panduan Instalasi - OLT Huawei Registration System
# Untuk Debian CT di Proxmox VE

## ============================================================
## PERSYARATAN SISTEM
## ============================================================
##
## - Proxmox CT (LXC) dengan Debian 11/12
## - RAM minimal: 1 GB (rekomendasi 2 GB)
## - Disk minimal: 10 GB
## - Jaringan: Harus bisa akses OLT via Telnet (port 23)
## - Port yang dipakai: 3000 (frontend), 8001 (backend)
##
## ============================================================

# ==============================================================
# LANGKAH 1: BUAT CT DI PROXMOX
# ==============================================================
#
# 1. Login ke Proxmox Web UI
# 2. Klik "Create CT"
# 3. Pilih template: debian-12-standard
# 4. Disk: 10 GB
# 5. CPU: 2 core
# 6. RAM: 2048 MB
# 7. Network: Bridge sesuai jaringan OLT (vmbr0/vmbr1)
#    - IP: sesuaikan dengan jaringan Anda
#    - Gateway: sesuaikan
# 8. Start CT setelah dibuat

# ==============================================================
# LANGKAH 2: UPDATE SISTEM & INSTALL DEPENDENSI
# ==============================================================

# Login ke CT via console atau SSH
apt update && apt upgrade -y

# Install dependensi dasar
apt install -y curl wget git build-essential python3 python3-pip python3-venv nginx

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Yarn
npm install -g yarn

# Install MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt update && apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Verifikasi MongoDB jalan
mongosh --eval "db.runCommand({ping:1})"

# ==============================================================
# LANGKAH 3: BUAT DIREKTORI APLIKASI
# ==============================================================

mkdir -p /opt/olt-registration
cd /opt/olt-registration

# ==============================================================
# LANGKAH 4: COPY FILE APLIKASI
# ==============================================================
#
# Copy semua file dari development ke server.
# Struktur folder yang dibutuhkan:
#
# /opt/olt-registration/
# ├── backend/
# │   ├── server.py
# │   ├── olt_telnet.py
# │   ├── requirements.txt
# │   └── .env
# └── frontend/
#     ├── package.json
#     ├── yarn.lock
#     ├── public/
#     ├── src/
#     ├── tailwind.config.js
#     ├── postcss.config.js
#     ├── craco.config.js
#     ├── jsconfig.json
#     └── .env
#
# Cara copy (dari komputer lokal ke CT):
# scp -r /path/to/backend root@<IP_CT>:/opt/olt-registration/
# scp -r /path/to/frontend root@<IP_CT>:/opt/olt-registration/

# ==============================================================
# LANGKAH 5: SETUP BACKEND
# ==============================================================

cd /opt/olt-registration/backend

# Buat virtual environment Python
python3 -m venv venv
source venv/bin/activate

# Install dependensi Python
pip install fastapi uvicorn python-dotenv pymongo pydantic motor pyjwt python-jose

# Buat file .env backend
cat > /opt/olt-registration/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=olt_registration
CORS_ORIGINS=*
JWT_SECRET=ganti-dengan-secret-key-yang-kuat-dan-random
EOF

# Test backend bisa jalan
cd /opt/olt-registration/backend
source venv/bin/activate
python3 -c "from server import app; print('Backend OK')"

# ==============================================================
# LANGKAH 6: SETUP FRONTEND
# ==============================================================

cd /opt/olt-registration/frontend

# Buat file .env frontend
# GANTI <IP_CT> dengan IP address CT Anda
cat > /opt/olt-registration/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://<IP_CT>
EOF

# Install dependensi Node.js
yarn install

# Build frontend untuk production
yarn build

# Hasil build ada di folder: /opt/olt-registration/frontend/build/

# ==============================================================
# LANGKAH 7: SETUP SYSTEMD SERVICE - BACKEND
# ==============================================================

cat > /etc/systemd/system/olt-backend.service << 'EOF'
[Unit]
Description=OLT Registration Backend (FastAPI)
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

# Cek status backend
systemctl status olt-backend
curl http://localhost:8001/api/health

# ==============================================================
# LANGKAH 8: SETUP NGINX (REVERSE PROXY + FRONTEND)
# ==============================================================

# GANTI <IP_CT> dengan IP address CT Anda
cat > /etc/nginx/sites-available/olt-registration << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Frontend (React build)
    root /opt/olt-registration/frontend/build;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # React Router - semua route diarahkan ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

# Aktifkan site & hapus default
ln -sf /etc/nginx/sites-available/olt-registration /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test konfigurasi nginx
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

# ==============================================================
# LANGKAH 9: VERIFIKASI INSTALASI
# ==============================================================

echo ""
echo "============================================"
echo "  VERIFIKASI INSTALASI"
echo "============================================"

# Cek semua service jalan
echo "1. MongoDB:"
systemctl is-active mongod

echo "2. Backend:"
systemctl is-active olt-backend

echo "3. Nginx:"
systemctl is-active nginx

echo "4. API Health:"
curl -s http://localhost:8001/api/health

echo ""
echo "5. Frontend build:"
ls -la /opt/olt-registration/frontend/build/index.html

echo ""
echo "============================================"
echo "  INSTALASI SELESAI!"
echo "============================================"
echo ""
echo "  Akses web: http://<IP_CT>"
echo ""
echo "  Langkah selanjutnya:"
echo "  1. Buka browser, akses http://<IP_CT>"
echo "  2. Klik 'Daftar' untuk buat akun pertama"
echo "  3. Login, lalu tambahkan OLT di menu 'OLT Management'"
echo "  4. Buat profil registrasi di menu 'ONT Register'"
echo "  5. Klik 'Temukan ONT Baru' untuk scan"
echo "  6. Pilih ONT & profil, lalu 'Registrasi 1-Klik'"
echo ""

# ==============================================================
# TROUBLESHOOTING
# ==============================================================
#
# 1. Backend tidak jalan:
#    journalctl -u olt-backend -f
#
# 2. MongoDB tidak jalan:
#    journalctl -u mongod -f
#
# 3. Nginx error:
#    tail -f /var/log/nginx/error.log
#
# 4. Scan ONT gagal (timeout):
#    - Pastikan CT bisa ping ke IP OLT
#    - Pastikan port telnet (23) tidak diblokir firewall
#    - Test manual: telnet <IP_OLT> 23
#
# 5. Reset database:
#    mongosh
#    use olt_registration
#    db.dropDatabase()
#
# 6. Ganti JWT Secret:
#    - Edit /opt/olt-registration/backend/.env
#    - Ganti JWT_SECRET=...
#    - systemctl restart olt-backend
#
# 7. Update aplikasi:
#    - Copy file baru ke /opt/olt-registration/
#    - cd /opt/olt-registration/frontend && yarn build
#    - systemctl restart olt-backend
#    - systemctl restart nginx
#
# ==============================================================
# KEAMANAN (OPSIONAL)
# ==============================================================
#
# 1. Buat user non-root untuk service:
#    useradd -r -s /bin/false olt-app
#    chown -R olt-app:olt-app /opt/olt-registration
#    # Edit olt-backend.service: User=olt-app
#
# 2. Firewall (ufw):
#    apt install ufw
#    ufw allow 80/tcp    # HTTP
#    ufw allow 22/tcp    # SSH
#    ufw enable
#
# 3. HTTPS dengan Let's Encrypt (jika punya domain):
#    apt install certbot python3-certbot-nginx
#    certbot --nginx -d olt.domain.com
#
# ==============================================================
