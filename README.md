# Village Management Backend API

Backend API for Village Management Application built with Node.js, Express, TypeScript, and Prisma.

## Features

- ✅ **Authentication** - JWT-based auth with role-based access control (Admin/Warga)
- ✅ **Donation System** - File upload for proof of transfer, admin approval workflow
- ✅ **Kegiatan Management** - Village activities with progress tracking
- ✅ **AI Legal Q&A** - OpenAI-powered legal assistance with quota system
- ✅ **Smart Farm** - Weather-integrated AI crop analysis
- ✅ **Admin Dashboard** - Statistics, activity logs, user management

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Bcrypt
- **File Upload**: Multer
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- (Optional) OpenAI API key for AI features
- (Optional) OpenWeather API key for Smart Farm

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Database Setup

The application will work in demo mode without external APIs, but for full functionality:

1. Set up a PostgreSQL database
2. Update `DATABASE_URL` in `.env`
3. Run migrations: `npm run prisma:migrate`
4. (Optional) Open Prisma Studio: `npm run prisma:studio`

### API Endpoints

#### Authentication

- `POST /api/auth/register` - Register new user (warga)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout

#### Kegiatan (Village Activities)

- `GET /api/kegiatan` - Get all kegiatan (public)
- `GET /api/kegiatan/:id` - Get kegiatan detail (public)
- `POST /api/kegiatan` - Create kegiatan (admin)
- `PUT /api/kegiatan/:id` - Update kegiatan (admin)
- `PATCH /api/kegiatan/:id/status` - Update status (admin)

#### Donations

- `POST /api/donasi` - Submit donation with proof (public/auth)
- `GET /api/donasi/kegiatan/:id` - Get approved donations (public)
- `GET /api/donasi/my-donations` - Get user donations (auth)
- `GET /api/donasi/pending` - Get pending donations (admin)
- `PUT /api/donasi/:id/approve` - Approve donation (admin)
- `PUT /api/donasi/:id/reject` - Reject donation (admin)

#### AI Legal Q&A

- `POST /api/ai/tanya-hukum` - Ask legal question (public/auth)
- `GET /api/ai/quota` - Check remaining quota

#### Smart Farm

- `POST /api/smartfarm` - Create farm record with AI analysis (auth)
- `GET /api/smartfarm` - Get user's farm records (auth)
- `GET /api/smartfarm/:id` - Get farm detail (auth)

#### Admin

- `GET /api/admin/dashboard` - Dashboard statistics (admin)
- `GET /api/admin/logs` - Activity logs (admin)
- `GET /api/admin/users` - Get all users (admin)
- `PATCH /api/admin/users/:id/status` - Ban/unban user (admin)

## Environment Variables

See `.env.example` for all available configuration options.

## Development

```bash
# Run development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
