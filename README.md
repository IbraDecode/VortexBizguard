# Vortex Bizguard - Bug WhatsApp Website

Website profesional untuk mengelola bug WhatsApp dengan sistem manajemen pengguna dan sender yang terintegrasi dengan MongoDB dan WhatsApp Baileys.

## 🚀 Fitur Utama

- 🔐 **Sistem Autentikasi**: Login/Register dengan JWT dan session management
- 👥 **Manajemen User**: Admin, Premium, User biasa dengan role-based access
- 📱 **WhatsApp Integration**: Kelola multiple sender WhatsApp dengan Baileys
- 🐛 **Bug Management**: Buat dan kelola bug WhatsApp (crash, freeze, spam, custom)
- 📊 **Dashboard**: Statistik dan monitoring real-time
- 🗄️ **MongoDB**: Database NoSQL untuk performa optimal
- 🔒 **Security**: Helmet, CORS, bcrypt password hashing
- 📱 **Responsive**: Mobile-friendly interface

## 🛠️ Teknologi

- **Backend**: Node.js, Express.js
- **Database**: MongoDB dengan Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + Session Management
- **WhatsApp**: @whiskeysockets/baileys (latest)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time**: Socket.io
- **Security**: Helmet, bcryptjs, CORS

## 📋 Prerequisites

- Node.js (v16 atau lebih baru)
- MongoDB (lokal atau MongoDB Atlas)
- npm atau yarn
- WhatsApp account untuk testing

## 🔧 Instalasi

### 1. Clone dan Setup
```bash
git clone <repository-url>
cd WebsiteBugWhatsApp
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
```

Edit file `.env`:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/vortexbizguard
# Atau untuk MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vortexbizguard

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here-change-this-in-production

# Admin Configuration
ADMIN_EMAIL=admin@vortexbizguard.com
ADMIN_PASSWORD=admin123
ADMIN_USERNAME=admin

# Application Settings
SITE_NAME=Vortex Bizguard
COOLDOWN_TIME=300000
MAX_BUG_PER_DAY=50
ALLOW_REGISTRATION=false
```

### 3. Jalankan Aplikasi
```bash
# Development
npm run dev

# Production
npm start
```

### 4. Akses Aplikasi
- Buka browser: `http://localhost:3000`
- Login dengan admin credentials dari .env

## 🗄️ Struktur Database

### Collections MongoDB

#### Users
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (user|premium|admin|owner),
  status: String (active|inactive|banned),
  telegramId: String (optional),
  createdAt: Date,
  lastLogin: Date
}
```

#### Bugs
```javascript
{
  name: String,
  description: String,
  type: String (crash|freeze|spam|custom),
  target: String (phone number),
  message: String,
  count: Number,
  delay: Number,
  status: String (active|stopped|completed|failed),
  progress: Number,
  createdBy: ObjectId (ref: User),
  createdAt: Date
}
```

#### Senders
```javascript
{
  name: String,
  phoneNumber: String (unique),
  status: String (connected|disconnected|connecting|error),
  qrCode: String,
  sessionData: Object,
  lastActivity: Date,
  createdBy: ObjectId (ref: User),
  createdAt: Date
}
```

#### Sessions
```javascript
{
  userId: ObjectId (ref: User),
  token: String (unique),
  expiresAt: Date,
  createdAt: Date,
  lastAccessed: Date,
  ipAddress: String,
  userAgent: String
}
```

#### Activities
```javascript
{
  userId: ObjectId (ref: User),
  action: String,
  description: String,
  ipAddress: String,
  userAgent: String,
  metadata: Object,
  createdAt: Date
}
```

#### Settings
```javascript
{
  key: String (unique),
  value: Mixed,
  description: String,
  updatedBy: ObjectId (ref: User),
  updatedAt: Date,
  createdAt: Date
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Registrasi pengguna baru
- `POST /api/auth/login` - Login pengguna
- `POST /api/auth/logout` - Logout pengguna
- `GET /api/auth/verify` - Verifikasi token

### Users (Admin/Owner only)
- `GET /api/users` - Daftar semua pengguna
- `GET /api/users/premium` - Daftar pengguna premium
- `GET /api/users/admin` - Daftar admin
- `GET /api/users/:id` - Detail pengguna
- `PUT /api/users/:id` - Update pengguna
- `DELETE /api/users/:id` - Hapus pengguna
- `POST /api/users/:id/promote` - Promote ke premium
- `POST /api/users/:id/demote` - Demote dari premium
- `POST /api/users/:id/ban` - Ban pengguna
- `POST /api/users/:id/unban` - Unban pengguna

### Bugs (Premium/Owner only)
- `GET /api/bug` - Daftar bug pengguna
- `POST /api/bug` - Buat bug baru
- `GET /api/bug/:id` - Detail bug
- `PUT /api/bug/:id` - Update bug
- `DELETE /api/bug/:id` - Hapus bug
- `POST /api/bug/:id/execute` - Execute bug
- `POST /api/bug/:id/stop` - Stop bug execution
- `GET /api/bug/cooldown/status` - Status cooldown

### Senders (Owner only)
- `GET /api/senders` - Daftar sender
- `POST /api/senders` - Tambah sender baru
- `GET /api/senders/:id` - Detail sender
- `PUT /api/senders/:id` - Update sender
- `DELETE /api/senders/:id` - Hapus sender
- `POST /api/senders/:id/connect` - Connect ke WhatsApp
- `POST /api/senders/:id/disconnect` - Disconnect dari WhatsApp
- `POST /api/senders/:id/pairing-code` - Generate pairing code
- `GET /api/senders/:id/status` - Status sender

### Dashboard
- `GET /api/dashboard/stats` - Statistik dashboard
- `GET /api/dashboard/activities` - Log aktivitas
- `GET /api/dashboard/system` - Info sistem
- `GET /api/dashboard/users/stats` - Statistik pengguna

## 🐛 Bug Types

### 1. Crash Bug (Sixcrash)
- **Fungsi**: Menyebabkan aplikasi WhatsApp crash
- **Target**: Individual atau grup
- **Efek**: Force close aplikasi

### 2. Freeze Bug (Brown)
- **Fungsi**: Menyebabkan aplikasi WhatsApp freeze/hang
- **Target**: Individual atau grup
- **Efek**: Aplikasi tidak responsif

### 3. Spam Bug (Xinvis)
- **Fungsi**: Mengirim pesan dengan karakter invisible
- **Target**: Individual atau grup
- **Efek**: Spam dengan pesan tersembunyi

### 4. Custom Bug (Xui)
- **Fungsi**: Custom message dengan UI breaking characters
- **Target**: Individual atau grup
- **Efek**: Merusak tampilan UI WhatsApp

## 📱 WhatsApp Integration

### Setup Sender
1. Tambah sender baru di dashboard
2. Connect sender ke WhatsApp
3. Scan QR code atau gunakan pairing code
4. Sender siap digunakan untuk bug execution

### Session Management
- Auto-reconnect jika terputus
- Session persistence dengan file auth
- Multiple sender support
- Real-time status monitoring

## 🔒 Security Features

### Authentication
- JWT token dengan expiry
- Session management dengan auto-cleanup
- Password hashing dengan bcrypt
- Role-based access control

### API Security
- Helmet untuk security headers
- CORS protection
- Input validation
- Rate limiting (dapat ditambahkan)

### Data Protection
- Encrypted password storage
- Session token validation
- Activity logging untuk audit

## 🚀 Deployment

### Vercel Deployment
1. Setup environment variables di Vercel:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `SESSION_SECRET`

2. Deploy:
   ```bash
   vercel --prod
   ```

### Manual Deployment
1. Setup production environment
2. Install dependencies: `npm install --production`
3. Setup MongoDB connection
4. Start application: `npm start`

## 📊 Monitoring

### Dashboard Features
- Real-time user statistics
- Bug execution monitoring
- Sender status tracking
- System performance metrics
- Activity logs dengan filtering

### Logging
- User activities (login, logout, actions)
- Bug execution results
- WhatsApp connection status
- Error tracking

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Database Setup
```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas cloud
```

### Testing
- Test all API endpoints dengan Postman
- Test WhatsApp integration dengan real device
- Test responsive design di berbagai device

## 🔧 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection string
echo $MONGODB_URI
```

### WhatsApp Connection Issues
- Pastikan phone number format benar (+62xxx)
- Clear session data jika error persist
- Check internet connection
- Verify Baileys version compatibility

### Port Issues
```bash
# Check port usage
lsof -i :3000

# Kill process
kill -9 <PID>
```

## 📞 Support

### Common Issues
1. **Login Error**: Check JWT_SECRET dan database connection
2. **WhatsApp Error**: Verify phone number format dan session data
3. **Permission Error**: Check user role dan authentication
4. **Database Error**: Verify MongoDB connection dan credentials

### Logs
- Server logs: Check terminal output
- Browser logs: Check developer console (F12)
- MongoDB logs: Check MongoDB log files

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

## 👨‍💻 Author

**Ibra Decode**
- Email: admin@vortexbizguard.com
- Website: [Vortex Bizguard](https://vortexbizguard.com)

---

## ⚠️ Disclaimer

Tool ini dibuat untuk tujuan edukasi dan testing. Penggunaan untuk tujuan yang merugikan atau melanggar ToS WhatsApp adalah tanggung jawab pengguna. Gunakan dengan bijak dan bertanggung jawab.

## 🔄 Changelog

### v2.0.0 (Current)
- ✅ Migrasi ke MongoDB
- ✅ WhatsApp Baileys integration
- ✅ Enhanced security features
- ✅ Session management
- ✅ Activity logging
- ✅ Real bug functionality
- ✅ Responsive design improvements

### v1.0.0
- Basic file-based storage
- Simple authentication
- Basic WhatsApp integration
- Dashboard prototype

