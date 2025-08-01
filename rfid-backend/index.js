require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

// Test database connection on startup
db.connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'RFID Backend Server is running' 
  });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth check - Token present:', !!token);

  if (!token) {
    console.log('❌ No token provided');
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.sendStatus(403);
    }
    console.log('✅ Token verified for user ID:', user.id);
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/signup', async (req, res) => {
  try {
    console.log('📝 Signup attempt for:', req.body.email);
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO auth_users (name, email, password, role) 
       VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role, tag_id, status, balance`,
      [name, email, hashedPassword]
    );
    
    const token = jwt.sign(
      { id: result.rows[0].id, role: result.rows[0].role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log('✅ User created successfully:', result.rows[0].id);
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('🔑 Login attempt for:', req.body.email);
    const { email, password } = req.body;
    
    const result = await db.query(
      'SELECT * FROM auth_users WHERE email = $1', 
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    const { password: _, ...userWithoutPassword } = user;
    console.log('✅ Login successful for user:', user.id, 'Role:', user.role);
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile data (IMPROVED with better error handling)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Profile request for user ID:', req.user.id);
    
    const result = await db.query(
      'SELECT id, name, email, role, tag_id, status, balance, created_at FROM auth_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.name, 'Tag ID:', user.tag_id);

    // Get recent transactions - WITH ERROR HANDLING
    let transactions = [];
    
    if (user.tag_id) {
      try {
        console.log('🔍 Fetching transactions for user with tag:', user.tag_id);
        
        // First check if required tables exist
        const tableCheck = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('transactions', 'scanners', 'stations')
        `);
        
        const existingTables = tableCheck.rows.map(row => row.table_name);
        console.log('📊 Available tables:', existingTables);
        
        if (existingTables.includes('transactions') && 
            existingTables.includes('scanners') && 
            existingTables.includes('stations')) {
          
          const transactionResult = await db.query(
            `SELECT t.*, s.type as scanner_type, st.name as station_name 
             FROM transactions t
             JOIN scanners s ON t.scanner_id = s.id
             JOIN stations st ON s.station_id = st.id
             WHERE t.user_id = $1
             ORDER BY t.timestamp DESC
             LIMIT 5`,
            [user.id]
          );
          transactions = transactionResult.rows;
          console.log('✅ Found', transactions.length, 'transactions');
        } else {
          console.log('⚠️ Transaction tables not found, skipping transaction history');
        }
      } catch (transactionError) {
        console.log('⚠️ Transaction query failed (non-critical):', transactionError.message);
        // Don't fail the entire request - just set empty transactions
        transactions = [];
      }
    } else {
      console.log('📝 User has no RFID tag, skipping transactions');
    }

    const responseData = {
      user: user,
      recentTransactions: transactions
    };

    console.log('✅ Profile data prepared successfully');
    res.json(responseData);
    
  } catch (err) {
    console.error('❌ Profile route error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Failed to load profile data',
      details: err.message 
    });
  }
});

// Admin routes - Managing users (SIMPLIFIED!)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Admin fetching all users');
    const result = await db.query(
      'SELECT id, name, email, tag_id, status, balance, created_at FROM auth_users WHERE role = $1 ORDER BY id DESC',
      ['user']
    );
    console.log('✅ Found', result.rows.length, 'users');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Users fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('➕ Admin creating new user:', req.body.name);
    const { name, tag_id, email, status = 'active', balance = 0 } = req.body;
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    const result = await db.query(
      `INSERT INTO auth_users (name, email, password, role, tag_id, status, balance)
       VALUES ($1, $2, $3, 'user', $4, $5, $6) RETURNING id, name, email, tag_id, status, balance`,
      [name, email, defaultPassword, tag_id, status, balance]
    );
    console.log('✅ User created with ID:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ User creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Admin deleting user:', req.params.id);
    await db.query('DELETE FROM auth_users WHERE id = $1 AND role = $2', [req.params.id, 'user']);
    console.log('✅ User deleted successfully');
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ User deletion error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// RFID scan endpoint
app.post('/api/rfid/scan', async (req, res) => {
  try {
    console.log('📡 RFID scan request:', req.body);
    const { tag_id, scanner_id } = req.body;
    
    const userResult = await db.query(
      'SELECT * FROM auth_users WHERE tag_id = $1 AND status = $2',
      [tag_id, 'active']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Invalid RFID tag:', tag_id);
      return res.status(404).json({ error: 'Invalid or inactive RFID tag' });
    }
    
    const user = userResult.rows[0];
    console.log('✅ Valid RFID scan for user:', user.name);
    
    // Try to log transaction (but don't fail if tables don't exist)
    try {
      const scannerResult = await db.query('SELECT type FROM scanners WHERE id = $1', [scanner_id]);
      const event = scannerResult.rows[0]?.type || 'entry';
      
      await db.query(
        'INSERT INTO transactions (user_id, scanner_id, event) VALUES ($1, $2, $3)',
        [user.id, scanner_id, event]
      );
      console.log('✅ Transaction logged:', event);
    } catch (transactionError) {
      console.log('⚠️ Could not log transaction (tables may not exist):', transactionError.message);
    }
    
    res.json({ 
      success: true, 
      user: { name: user.name, balance: user.balance },
      event: 'entry'
    });
  } catch (err) {
    console.error('❌ RFID scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('🔍 Route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 RFID Backend Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Available routes:`);
  console.log(`   POST /api/signup`);
  console.log(`   POST /api/login`);
  console.log(`   GET  /api/profile`);
  console.log(`   GET  /api/users (admin only)`);
  console.log(`   POST /api/users (admin only)`);
  console.log(`   DELETE /api/users/:id (admin only)`);
  console.log(`   POST /api/rfid/scan`);
});