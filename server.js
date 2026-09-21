require('dotenv/config');
const express = require('express');
const session = require('express-session');
const path = require('path');
const { pool, migrate } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded credentials
const AUTH_USER = 'admin';
const AUTH_PASS = 'bhavani123';

// ── Middleware ───────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'material-list-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days – stay logged in
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Make loggedIn status available to all templates
app.use((req, res, next) => {
  res.locals.loggedIn = Boolean(req.session && req.session.loggedIn);
  next();
});

// ── Helpers ─────────────────────────────────────────────────────────────

/** Validate material form fields. Returns an error string or null. */
function validateMaterial({ name, company, supplier, price, quantity }) {
  if (!name || !name.trim()) return 'Name is required.';
  if (!company || !company.trim()) return 'Company is required.';
  if (!supplier || !supplier.trim()) return 'Supplier is required.';
  if (price === '' || price === undefined || price === null) return 'Price is required.';
  if (isNaN(Number(price)) || Number(price) < 0) return 'Price must be a non-negative number.';
  // quantity is optional, but if provided must be a non-negative integer
  if (quantity !== '' && quantity !== undefined && quantity !== null && quantity !== '') {
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)
      return 'Quantity must be a non-negative integer.';
  }
  return null;
}

// ── Auth ────────────────────────────────────────────────────────────────

// Health check (no auth)
app.get('/health', (_req, res) => res.send('ok'));

// Login page
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/');
  res.render('login', { error: null });
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    req.session.loggedIn = true;
    return res.redirect('/');
  }
  res.status(401).render('login', { error: 'Invalid username or password.' });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Auth guard – everything below requires login
app.use((req, res, next) => {
  if (req.session && req.session.loggedIn) return next();
  res.redirect('/login');
});

// ── Routes ──────────────────────────────────────────────────────────────

// List all materials (with optional filtering)
app.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filterBy = req.query.filter || 'all'; // all | name | company | supplier

    let result;

    if (q) {
      let whereClause;
      if (filterBy === 'name') {
        whereClause = 'WHERE name ILIKE $1';
      } else if (filterBy === 'company') {
        whereClause = 'WHERE company ILIKE $1';
      } else if (filterBy === 'supplier') {
        whereClause = 'WHERE supplier ILIKE $1';
      } else {
        whereClause = 'WHERE name ILIKE $1 OR company ILIKE $1 OR supplier ILIKE $1';
      }

      result = await pool.query(
        `SELECT * FROM materials ${whereClause} ORDER BY created_at DESC`,
        [`%${q}%`]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM materials ORDER BY created_at DESC`
      );
    }

    const materials = result.rows;
    res.render('index', { materials, q, filterBy });
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).send('Internal server error');
  }
});

// New material form
app.get('/new', (_req, res) => {
  res.render('form', { material: {}, error: null, isEdit: false });
});

// Create material
app.post('/materials', async (req, res) => {
  const { name, company, supplier, price, quantity, unit } = req.body;
  const error = validateMaterial({ name, company, supplier, price, quantity });

  if (error) {
    return res.status(400).render('form', {
      material: { name, company, supplier, price, quantity, unit },
      error,
      isEdit: false,
    });
  }

  const qtyValue = (quantity !== '' && quantity != null) ? Number(quantity) : null;

  try {
    await pool.query(
      `INSERT INTO materials (name, company, supplier, price, quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name.trim(), company.trim(), supplier.trim(), Number(price), qtyValue, unit ? unit.trim() : null]
    );
    res.redirect('/');
  } catch (err) {
    console.error('POST /materials error:', err);
    res.status(500).render('form', {
      material: { name, company, supplier, price, quantity, unit },
      error: 'Failed to save material. Please try again.',
      isEdit: false,
    });
  }
});

// Edit material form
app.get('/materials/:id/edit', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials WHERE id = $1', [
      req.params.id,
    ]);
    if (result.rows.length === 0) return res.status(404).send('Material not found');
    res.render('form', { material: result.rows[0], error: null, isEdit: true });
  } catch (err) {
    console.error('GET /materials/:id/edit error:', err);
    res.status(500).send('Internal server error');
  }
});

// Update material
app.post('/materials/:id', async (req, res) => {
  const { name, company, supplier, price, quantity, unit } = req.body;
  const error = validateMaterial({ name, company, supplier, price, quantity });

  if (error) {
    return res.status(400).render('form', {
      material: { id: req.params.id, name, company, supplier, price, quantity, unit },
      error,
      isEdit: true,
    });
  }

  const qtyValue = (quantity !== '' && quantity != null) ? Number(quantity) : null;

  try {
    const result = await pool.query(
      `UPDATE materials
       SET name = $1, company = $2, supplier = $3, price = $4, quantity = $5, unit = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name.trim(), company.trim(), supplier.trim(), Number(price), qtyValue, unit ? unit.trim() : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).send('Material not found');
    res.redirect('/');
  } catch (err) {
    console.error('POST /materials/:id error:', err);
    res.status(500).render('form', {
      material: { id: req.params.id, name, company, supplier, price, quantity, unit },
      error: 'Failed to update material. Please try again.',
      isEdit: true,
    });
  }
});

// Delete material
app.post('/materials/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    res.redirect('/');
  } catch (err) {
    console.error('POST /materials/:id/delete error:', err);
    res.status(500).send('Internal server error');
  }
});

// ── Start ───────────────────────────────────────────────────────────────
migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
