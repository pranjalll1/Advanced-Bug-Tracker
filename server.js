// Import required packages
const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');

// Load environment variables FIRST — before anything else
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

// Initialize the express app
const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({origin:'*'}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ─── Import Routes ────────────────────────────────────────────
const authRoutes  = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bugRoutes   = require('./routes/bugRoutes');
const taskRoutes  = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');


// ─── Mount Routes ─────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bugs',  bugRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);


// ─── Test Route ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🚀 Bug Tracker API is running!' });
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});