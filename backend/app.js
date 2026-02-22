
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
// Using port 5001 to avoid conflicts
const port = 5001;

// Configure CORS to allow requests from frontend
const corsOptions = {
    origin: [
        'http://localhost:3000',
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
  scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const upload = multer({ storage: multer.memoryStorage() });

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

        // Transform to array of objects, filtering out already registered users and those on leave
        // Row structure: [Zone, Name, Mobile, Participated, Status]
        const data = rows
            .filter(row => {
                const status = (row[4] || '').trim();
                // Only include if status is NOT "Success" and NOT "Leave"
                return status !== 'Success' && status !== 'Leave';
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

// 2b. POST /api/call-status - Update Call Status (Col I) and Remarks (Col J)
app.post('/api/call-status', async (req, res) => {
    console.log("Received call status update request", req.body);
    const { zone, name, callStatus, remarks } = req.body;

    try {
        // 1. Fetch range A:B to find row
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:B', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No data found in sheet' });
        }

        // 2. Find row index
        const rowIndex = rows.findIndex(row => {
            const rowZone = (row[0] || '').trim().toLowerCase();
            const rowName = (row[1] || '').trim().toLowerCase();
            return rowZone === zone.trim().toLowerCase() && rowName === name.trim().toLowerCase();
        });

        if (rowIndex === -1) {
            console.error(`User not found: ${zone} - ${name}`);
            return res.status(404).json({ status: 'error', message: 'User not found in the list' });
        }

        const exactRowNumber = rowIndex + 2;
        console.log(`Found user at row ${exactRowNumber}`);

        // 3. Update columns I (Call Status) and J (Remarks)
        const updateRange = `ExecutiveList!I${exactRowNumber}:J${exactRowNumber}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[callStatus, remarks]]
            },
        });

        console.log("Successfully updated call status");
        res.json({ status: 'success', message: 'Call status updated successfully' });
    } catch (error) {
        console.error('Error updating call status:', error);
        res.status(500).send('Error updating call status: ' + error.message);
    }
});

// 2c. GET /api/config - Read saved WhatsApp message (S1) and image URL (T1)
app.get('/api/config', authenticateToken, async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!S1:U1',
        });
        const row = (response.data.values || [[]])[0] || [];
        res.json({
            message: row[0] || '',
            imageUrl: row[1] || ''
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// 2d. POST /api/config/message - Save WhatsApp message to S1
app.post('/api/config/message', authenticateToken, async (req, res) => {
    const { message } = req.body;
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!S1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[message]] },
        });
        console.log('WhatsApp message saved to S1');
        res.json({ success: true, message: 'Message saved successfully' });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// 2e. POST /api/config/image - Upload image to Google Drive, save URL to T1, fileId to U1
app.post('/api/config/image', authenticateToken, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        // Check for existing Drive file to delete
        const configRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!T1:U1',
        });
        const configRow = (configRes.data.values || [[]])[0] || [];
        const oldFileId = configRow[1]; // U1 stores previous Drive file ID

        if (oldFileId) {
            try {
                await drive.files.delete({ fileId: oldFileId });
                console.log('Deleted old Drive file:', oldFileId);
            } catch (e) {
                console.warn('Could not delete old file:', e.message);
            }
        }

        // Upload new image to Google Drive
        const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const stream = Readable.from(req.file.buffer);

        const driveRes = await drive.files.create({
            requestBody: {
                name: `campaign-image-${Date.now()}.${ext}`,
                mimeType: req.file.mimetype,
            },
            media: {
                mimeType: req.file.mimetype,
                body: stream,
            },
            fields: 'id',
        });

        const fileId = driveRes.data.id;

        // Make the file publicly readable
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        // Save image URL to T1, fileId to U1 (for future replacement)
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!T1:U1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[imageUrl, fileId]] },
        });

        console.log('Image uploaded to Drive and URL saved to T1:', imageUrl);
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});

// --- Authentication & Dashboard Routes ---
const { authenticateToken, generateToken } = require('./auth');
const bcrypt = require('bcryptjs');

// Admin credentials from .env
// Admin credentials from .env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 3. POST /api/auth/login - Admin login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check Master Admin (from .env)
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = generateToken({ username, role: 'super-admin' });
            return res.json({ 
                success: true,
                token, 
                user: { username, role: 'super-admin' } 
            });
        }

        // 2. Check Sheet Admins
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'admin!A2:B', 
            });

            const rows = response.data.values || [];
            
            // Find matching user
            const adminUser = rows.find(row => {
                const sheetUsername = (row[0] || '').trim();
                const sheetPassword = (row[1] || '').trim(); // Plain text as requested
                return sheetUsername === username && sheetPassword === password;
            });

            if (adminUser) {
                const token = generateToken({ username, role: 'admin' });
                return res.json({ 
                    success: true,
                    token, 
                    user: { username, role: 'admin' } 
                });
            }

        } catch (sheetError) {
            console.error('Error fetching admin sheet:', sheetError);
            // Don't fail the whole request, just log it. 
            // If master admin failed and sheet fetch failed, we return invalid credentials below.
        }

        res.status(401).json({ success: false, error: 'Invalid credentials' });

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
        // Filter out rows where status is "Leave"
        const activeRows = rows.filter(row => (row[4] || '').trim() !== 'Leave');
        const total = activeRows.length;
        const registered = activeRows.filter(row => (row[4] || '').trim() === 'Success').length;
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
        
        // Group by zone, excluding rows with "Leave" status
        const zoneMap = {};
        rows.forEach(row => {
            const zone = (row[0] || '').trim();
            const status = (row[4] || '').trim();
            
            if (!zone) return;
            // Skip rows where status is "Leave"
            if (status === 'Leave') return;
            
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
        const { zone, status, role } = req.query;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:J',
        });

        let rows = response.data.values || [];
        
        // Transform to member objects, excluding those with "Leave" status
        let members = rows
            .filter(row => (row[4] || '').trim() !== 'Leave')
            .map(row => {
                const mobileC = (row[2] || '').trim();
                const mobileH = (row[7] || '').trim();
                // Use column H if column C is empty
                const mobile = mobileC || mobileH;

                return {
                    zone: (row[0] || '').trim(),
                    name: (row[1] || '').trim(),
                    mobile: mobile,
                    participated: (row[3] || '').trim(),
                    status: (row[4] || '').trim(),
                    role: (row[5] || '').trim(),
                    executive: (row[6] || '').trim(),
                    registered: (row[4] || '').trim() === 'Success',
                    callStatus: (row[8] || '').trim(),
                    callRemarks: (row[9] || '').trim()
                };
            });

        // Filter by zone if specified
        if (zone && zone !== 'all') {
            members = members.filter(m => m.zone.toLowerCase() === zone.toLowerCase());
        }

        // Filter by role if specified
        if (role && role !== 'All') {
            if (role === 'Secretariat') {
                members = members.filter(m => m.role === role);
            } else if (role === 'Executive') {
                members = members.filter(m => m.executive === role);
            }
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

// 7. GET /api/dashboard/role-stats - Get zone-wise role statistics (Protected)
app.get('/api/dashboard/role-stats', authenticateToken, async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ExecutiveList!A2:G',
        });

        const rows = response.data.values || [];
        
        // Filter out rows with "Leave" status
        const activeRows = rows.filter(row => (row[4] || '').trim() !== 'Leave');
        
        // Group by zone and calculate stats for each role
        const zoneStats = {};
        
        activeRows.forEach(row => {
            const zone = (row[0] || '').trim();
            const status = (row[4] || '').trim();
            const role = (row[5] || '').trim();
            const executive = (row[6] || '').trim();
            
            if (!zone) return;
            
            if (!zoneStats[zone]) {
                zoneStats[zone] = {
                    name: zone,
                    secretariat: { total: 0, registered: 0 },
                    executive: { total: 0, registered: 0 }
                };
            }
            
            // Count Secretariat members
            if (role === 'Secretariat') {
                zoneStats[zone].secretariat.total++;
                if (status === 'Success') {
                    zoneStats[zone].secretariat.registered++;
                }
            }
            
            // Count Executive members
            if (executive === 'Executive') {
                zoneStats[zone].executive.total++;
                if (status === 'Success') {
                    zoneStats[zone].executive.registered++;
                }
            }
        });
        
        // Convert to array and calculate percentages
        const stats = Object.values(zoneStats).map(zone => ({
            name: zone.name,
            secretariat: {
                total: zone.secretariat.total,
                registered: zone.secretariat.registered,
                percentage: zone.secretariat.total > 0 
                    ? ((zone.secretariat.registered / zone.secretariat.total) * 100).toFixed(1)
                    : 0,
                isComplete: zone.secretariat.total > 0 && zone.secretariat.registered === zone.secretariat.total
            },
            executive: {
                total: zone.executive.total,
                registered: zone.executive.registered,
                percentage: zone.executive.total > 0 
                    ? ((zone.executive.registered / zone.executive.total) * 100).toFixed(1)
                    : 0,
                isComplete: zone.executive.total > 0 && zone.executive.registered === zone.executive.total
            }
        }));
        
        res.json({ stats });
    } catch (error) {
        console.error('Error fetching role stats:', error);
        res.status(500).json({ error: 'Failed to fetch role statistics' });
    }
});


app.listen(port, () => {
    console.log(`Backend server strictly running at http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');
});
