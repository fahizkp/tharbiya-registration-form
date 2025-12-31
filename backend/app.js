
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
// Using port 5001 to avoid conflicts
const port = 5001;

// Configure CORS to allow requests from frontend
const corsOptions = {
    origin: [
        'http://localhost:3001',
        'https://tharbiya-registration-form-frontend.onrender.com',
        'https://tharbiya.wisdommlpe.site'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// --- Google Sheets Setup ---
// User must provide valid credentials in .env or service-account.json
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_AUTH_EMAIL = process.env.GOOGLE_AUTH_EMAIL;

// Robust parsing for the private key
const getPrivateKey = () => {
    let key = process.env.GOOGLE_AUTH_PRIVATE_KEY;
    if (!key) {
        console.error("FATAL: GOOGLE_AUTH_PRIVATE_KEY is missing from .env");
        return null;
    }
    
    // CASE 1: Key has literal \n characters (common if copied from JSON to .env)
    // Convert literal \n to actual newlines
    key = key.replace(/\\n/g, '\n');

    // CASE 2: Key is wrapped in quotes in the .env value itself
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1);
    }

    // CASE 3: Check for header presence
    if (!key.includes('BEGIN PRIVATE KEY')) {
        console.error("FATAL: Private key seems invalid. It does not contain 'BEGIN PRIVATE KEY'");
        // Try to fix common copy-paste issue where header is missing?
    }

    console.log("Processed Private Key first 30 chars: ", key.substring(0, 30));
    console.log("Processed Private Key length: ", key.length);
    
    return key;
};

const GOOGLE_AUTH_KEY = getPrivateKey();

// Authentication using a service account credentials
const auth = new google.auth.GoogleAuth({
  credentials: {
      client_email: GOOGLE_AUTH_EMAIL,
      private_key: GOOGLE_AUTH_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// --- Routes ---

// 1. GET /api/data - Fetch Mandalam and Name options from Sheet Tab "ExecutiveList"
// Only returns users who haven't registered yet (Status column E is empty or not "Success")
app.get('/api/data', async (req, res) => {
    console.log("Received request for /api/data");
    try {
        // Sheet: ExecutiveList
        // Col A: Zone (Mandalam), Col B: Name, Col E: Status
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:E', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found in sheet");
            return res.json([]);
        }

        // Transform to array of objects, filtering out already registered users
        // Row structure: [Zone, Name, Mobile, Participated, Status]
        const data = rows
            .filter(row => {
                const status = (row[4] || '').trim();
                // Only include if status is NOT "Success"
                return status !== 'Success';
            })
            .map(row => ({
                mandalam: row[0] || '',
                name: row[1] || ''
            }));
        
        console.log(`Fetched ${data.length} unregistered users out of ${rows.length} total`);
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from sheets:', error);
        res.status(500).send({ error: 'Error fetching data: ' + error.message });
    }
});

// 2. POST /api/register - Update mobile (Col C) and participated (Col D) for matching Zone/Name
app.post('/api/register', async (req, res) => {
    console.log("Received registration request", req.body);
    const { mandalam, name, mobile, participated } = req.body;

    try {
        // 1. Fetch the entire list first to find the row index
        // We know A=Zone, B=Name
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:B', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No data found in sheet' });
        }

        // 2. Find the row index where Zone and Name match
        // Note: rows index 0 corresponds to A2, 1 to A3, etc.
        // So actual sheet row = index + 2
        const rowIndex = rows.findIndex(row => {
            const rowMandalam = (row[0] || '').trim().toLowerCase();
            const rowName = (row[1] || '').trim().toLowerCase();
            return rowMandalam === mandalam.trim().toLowerCase() && rowName === name.trim().toLowerCase();
        });

        if (rowIndex === -1) {
            console.error(`User not found: ${mandalam} - ${name}`);
            return res.status(404).json({ status: 'error', message: 'User not found in the list' });
        }

        const exactRowNumber = rowIndex + 2;
        console.log(`Found user at row ${exactRowNumber}`);

        // 3. Update columns C (Mobile), D (Participated), E (Status) for that specific row
        // Range example: "ExecutiveList!C5:E5"
        const updateRange = `ExecutiveList!C${exactRowNumber}:E${exactRowNumber}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[mobile, participated, "Success"]]
            },
        });

        console.log("Successfully updated row");
        res.json({ status: 'success', message: 'Registration updated successfully' });
    } catch (error) {
        console.error('Error saving to sheets:', error);
        res.status(500).send('Error saving data: ' + error.message);
    }
});

// --- Authentication & Dashboard Routes ---
const { authenticateToken, generateToken } = require('./auth');
const bcrypt = require('bcryptjs');

// Admin credentials from .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 3. POST /api/auth/login - Admin login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Simple credential check (in production, use hashed passwords)
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const token = generateToken({ email, role: 'admin' });
            res.json({ 
                success: true,
                token, 
                user: { email, role: 'admin' } 
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// 4. GET /api/dashboard/stats - Overall statistics (Protected)
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:E',
        });

        const rows = response.data.values || [];
        const total = rows.length;
        const registered = rows.filter(row => (row[4] || '').trim() === 'Success').length;
        const notRegistered = total - registered;
        const percentageRegistered = total > 0 ? ((registered / total) * 100).toFixed(2) : 0;

        res.json({
            total,
            registered,
            notRegistered,
            percentageRegistered: parseFloat(percentageRegistered)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// 5. GET /api/dashboard/zones - Zone-wise statistics (Protected)
app.get('/api/dashboard/zones', authenticateToken, async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:E',
        });

        const rows = response.data.values || [];
        
        // Group by zone
        const zoneMap = {};
        rows.forEach(row => {
            const zone = (row[0] || '').trim();
            const status = (row[4] || '').trim();
            
            if (!zone) return;
            
            if (!zoneMap[zone]) {
                zoneMap[zone] = { name: zone, total: 0, registered: 0, notRegistered: 0 };
            }
            
            zoneMap[zone].total++;
            if (status === 'Success') {
                zoneMap[zone].registered++;
            } else {
                zoneMap[zone].notRegistered++;
            }
        });

        const zones = Object.values(zoneMap);
        res.json({ zones });
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({ error: 'Failed to fetch zone data' });
    }
});

// 6. GET /api/dashboard/members - Get member list with filtering (Protected)
app.get('/api/dashboard/members', authenticateToken, async (req, res) => {
    try {
        const { zone, status } = req.query;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:E',
        });

        let rows = response.data.values || [];
        
        // Transform to member objects
        let members = rows.map(row => ({
            zone: (row[0] || '').trim(),
            name: (row[1] || '').trim(),
            mobile: (row[2] || '').trim(),
            participated: (row[3] || '').trim(),
            status: (row[4] || '').trim(),
            registered: (row[4] || '').trim() === 'Success'
        }));

        // Filter by zone if specified
        if (zone && zone !== 'all') {
            members = members.filter(m => m.zone.toLowerCase() === zone.toLowerCase());
        }

        // Filter by status if specified
        if (status === 'registered') {
            members = members.filter(m => m.registered);
        } else if (status === 'not_registered') {
            members = members.filter(m => !m.registered);
        }

        res.json({ members });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

app.listen(port, () => {
    console.log(`Backend server strictly running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
});
