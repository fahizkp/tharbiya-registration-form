# Tharbiya 2026 Registration Form

A modern registration form application with admin dashboard for Tharbiya 2026 event, built with React and Node.js, integrated with Google Sheets.

## 🚀 Features

- **Registration Form**: Beautiful, responsive form with Malayalam support
- **Admin Dashboard**: Dark-themed dashboard with analytics
- **Google Sheets Integration**: Real-time data sync
- **Zone-based Filtering**: Filter by zones/Mandalam
- **Authentication**: Secure admin access with JWT

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Service Account with Sheets API enabled

## 🛠️ Installation

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with your credentials
# See .env.example for required variables
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

## 🔧 Environment Variables

Create a `.env` file in the `backend` directory:

```env
SPREADSHEET_ID=your_google_sheet_id
GOOGLE_AUTH_EMAIL=your_service_account_email
GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Admin Credentials
ADMIN_EMAIL=admin@tharbiya.com
ADMIN_PASSWORD=admin123
JWT_SECRET=your-super-secret-jwt-key
```

## 🏃 Running the Application

### Development Mode

**Backend:**
```bash
cd backend
npm start
# Server runs on http://localhost:5001
```

**Frontend:**
```bash
cd frontend
npm start
# App opens on http://localhost:3000
```

### Production Build

**Backend:**
```bash
cd backend
node app.js
```

**Frontend:**
```bash
cd frontend
npm run build
# Build files will be in the 'build' folder
```

## 📝 Scripts Reference

### Backend Scripts

| Command | Description |
|---------|-------------|
| `node app.js` | Start the backend server |

### Frontend Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Create production build |
| `npm test` | Run tests |
| `npm run eject` | Eject from Create React App |

## 🌐 Application URLs

- **Registration Form**: `http://localhost:3000/`
- **Admin Login**: `http://localhost:3000/login`
- **Admin Dashboard**: `http://localhost:3000/admin`

## 📊 Google Sheets Setup

1. Create a Google Sheet with the following tabs:
   - **ExecutiveList**: Columns: Zone (A), Name (B), Mobile (C), Participated (D), Status (E)
   - Add header row in row 1

2. Share the sheet with your service account email (Editor access)

3. Copy the Spreadsheet ID from the URL and add to `.env`

## 🔐 Admin Access

Default credentials (change in production):
- Email: `admin@tharbiya.com`
- Password: `admin123`

## 🎨 Tech Stack

**Frontend:**
- React 19
- TypeScript
- React Router DOM
- Axios
- Anek Malayalam & Quicksand fonts

**Backend:**
- Node.js
- Express
- Google Sheets API
- JWT for authentication
- dotenv for environment variables

## 📁 Project Structure

```
tharbiya-registration-form/
├── backend/
│   ├── app.js              # Main server file
│   ├── auth.js             # JWT authentication
│   ├── package.json        # Backend dependencies
│   └── .env                # Environment variables
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Auth context
│   │   └── App.js         # Main app component
│   └── package.json        # Frontend dependencies
└── .gitignore
```

## 🚢 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Install dependencies: `npm install`
3. Start server: `node app.js`

### Frontend Deployment

1. Build the app: `npm run build`
2. Deploy the `build` folder to your static hosting service

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For issues or questions, please open an issue on GitHub.
