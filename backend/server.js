require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Global Anti-Crash Handlers (bot va server kutilmagan xatolarda o'chib qolmasligi uchun)
process.on('uncaughtException', (err) => {
  console.error('⚠️ [ANTI-CRUSH] Uncaught Exception:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [ANTI-CRUSH] Unhandled Rejection at promise:', reason);
});

// Mongoose re-connection resilience
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose ulanishida xatolik:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose ulanishi uzildi. Qayta ulanishga harakat qilinmoqda...');
});

const User = require('./models/User');
const Event = require('./models/Event');
const Expense = require('./models/Expense');
const { initUserbot, sendUserbotMessage } = require('./userbot');
const { bot, sendNotification } = require('./bot');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

const createDefaultAdmin = async () => {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await User.create({ username: 'admin', password: hashedPassword, role: 'admin', fullName: 'Boshliq' });
        console.log('Default admin created.');
    }
};

const createDefaultOperator = async () => {
    const operatorExists = await User.findOne({ username: 'ali' });
    if (!operatorExists) {
        const operatorPassword = await bcrypt.hash('123', 10);
        await User.create({ username: 'ali', password: operatorPassword, role: 'operator', fullName: 'Ali Valiyev' });
        console.log('Default operator created.');
    }
};

const startDatabase = async () => {
  let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/timproduction';
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    await createDefaultAdmin();
    await createDefaultOperator();
    
    initUserbot();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log('Local MongoDB not found. Starting In-Memory MongoDB...');
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('Connected to In-Memory MongoDB');
    
    await createDefaultAdmin();
    await createDefaultOperator();
    
    initUserbot();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
  }
};
startDatabase();

// --- CRON JOB ---
cron.schedule('0 * * * *', async () => {
  console.log('Running cron job to check for upcoming events...');
  try {
    const now = new Date();
    const targetDateMin = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const targetDateMax = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingEvents = await Event.find({
      date: { $gte: targetDateMin, $lte: targetDateMax },
      notified: false
    }).populate('assignedOperators');

    for (const event of upcomingEvents) {
      const text = `Ertaga to'y bor!\n\n` +
        `📍 To'yxona: ${event.venue}\n` +
        `🗺 Manzil: ${event.location}\n` +
        `📹 Kamera soni: ${event.cameraCount}\n` +
        `🕒 Vaqti: ${new Date(event.date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n\n` +
        `Iltimos, tayyorgarlik ko'ring!`;

      for (const operator of event.assignedOperators) {
        if (operator.telegramUsername) {
            await sendUserbotMessage(operator.telegramUsername, `🔔 DIQQAT! Eslatma!\n\n` + text);
        } else if (operator.telegramChatId) {
            // fallback if sendNotification exists in current scope or replace with appropriate bot call
            await sendUserbotMessage(operator.telegramChatId, `🔔 *Eslatma!* ` + text);
        }
      }
      console.log("Cron job finished.");
      event.notified = true;
      await event.save();
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

// --- ROUTES ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    
    if (!user && username === 'admin' && password === 'admin') {
       const hashedPassword = await bcrypt.hash('admin', 10);
       user = new User({ username: 'admin', password: hashedPassword, role: 'admin', fullName: 'Boshliq' });
       await user.save();
    } else if (!user) {
      return res.status(401).json({ message: 'Noto\'g\'ri login yoki parol' });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Noto\'g\'ri login yoki parol' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role, fullName: user.fullName, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token topilmadi' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token noto\'g\'ri' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Ruxsat yo\'q' });
  next();
};

app.post('/api/operators', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, fullName, telegramUsername } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newOperator = new User({ username, password: hashedPassword, fullName, telegramUsername, role: 'operator' });
    await newOperator.save();
    res.json(newOperator);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik yuz berdi. Balki bu username allaqachon mavjud.' });
  }
});

app.get('/api/operators', authMiddleware, adminMiddleware, async (req, res) => {
  const operators = await User.find({ role: 'operator' }).select('-password');
  res.json(operators);
});

app.delete('/api/operators/:id', authMiddleware, adminMiddleware, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'O\'chirildi' });
});

app.put('/api/operators/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, fullName, telegramUsername } = req.body;
    let updateData = { username, fullName, telegramUsername };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const operator = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(operator);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

app.post('/api/events', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const events = await Event.find().populate('assignedOperators', '-password').sort({ date: 1 });
      res.json(events);
    } else {
      const events = await Event.find({ assignedOperators: req.user.id }).populate('assignedOperators', '-password').sort({ date: 1 });
      res.json(events);
    }
  } catch (error) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

app.delete('/api/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: 'O\'chirildi' });
});

app.post('/api/events/:id/send', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('assignedOperators');
    if (!event) return res.status(404).json({ message: 'Topilmadi' });

    const text = `Ertaga to'y bor!\n\n` +
        `📍 To'yxona: ${event.venue}\n` +
        `🗺 Manzil: ${event.location}\n` +
        `📹 Kamera soni: ${event.cameraCount}\n` +
        `💬 Komment: ${event.comment || "Yo'q"}\n` +
        `🕒 Vaqti: ${new Date(event.date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n\n` +
        `Iltimos, tayyorgarlik ko'ring!`;

    let sent = 0;
    for (const op of event.assignedOperators) {
        if (op.telegramUsername) {
            await sendUserbotMessage(op.telegramUsername, `🔔 DIQQAT! Eslatma!\n\n` + text);
            sent++;
        }
    }
    
    if (sent === 0) {
      return res.status(400).json({ message: "Operatorlarda Telegram username mavjud emas!" });
    }

    res.json({ message: `${sent} ta operatorga muvaffaqiyatli xabar yuborildi!` });
  } catch (error) {
    res.status(500).json({ message: 'Xatolik yuz berdi' });
  }
});

app.put('/api/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

app.put('/api/events/:id/status', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Topilmadi' });
    
    if (req.user.role === 'operator' && !event.assignedOperators.includes(req.user.id)) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    
    if (req.body.status) event.status = req.body.status;
    if (req.body.videoLink !== undefined) event.videoLink = req.body.videoLink;
    
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

app.get('/api/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const events = await Event.find();
    const expenses = await Expense.find();
    
    const monthlyStats = {};
    let totalBudget = 0;
    let totalAdvance = 0;
    let totalExpense = 0;
    
    events.forEach(e => {
      totalBudget += e.budget || 0;
      totalAdvance += e.advancePayment || 0;
      
      const month = new Date(e.date).toLocaleString('uz-UZ', { month: 'short', year: 'numeric' });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { month, count: 0, budget: 0, expense: 0, profit: 0 };
      }
      monthlyStats[month].count += 1;
      monthlyStats[month].budget += (e.budget || 0);
    });
    
    expenses.forEach(ex => {
      totalExpense += ex.amount || 0;
      const month = new Date(ex.date).toLocaleString('uz-UZ', { month: 'short', year: 'numeric' });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { month, count: 0, budget: 0, expense: 0, profit: 0 };
      }
      monthlyStats[month].expense += (ex.amount || 0);
    });
    
    // Calculate profit per month
    Object.keys(monthlyStats).forEach(m => {
      monthlyStats[m].profit = monthlyStats[m].budget - monthlyStats[m].expense;
    });
    
    res.json({
      totalEvents: events.length,
      totalBudget,
      totalAdvance,
      totalExpense,
      netProfit: totalBudget - totalExpense,
      debt: totalBudget - totalAdvance,
      monthlyChart: Object.values(monthlyStats)
    });
  } catch (error) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// EXPENSES ROUTES
app.get('/api/expenses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

app.post('/api/expenses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

app.delete('/api/expenses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "O'chirildi" });
  } catch (error) {
    res.status(400).json({ message: 'Xatolik' });
  }
});

// CRON JOB
cron.schedule('0 9 * * *', async () => {
  try {
    console.log("Running daily reminder check...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0));
    const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999));
    
    const events = await Event.find({
      date: { $gte: tomorrowStart, $lte: tomorrowEnd }
    }).populate('assignedOperators');

    for (const event of events) {
      for (const op of event.assignedOperators) {
        if (op.telegramChatId) {
          const time = new Date(event.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          const message = `Ertaga soat ${time} da <b>${event.title}</b> to'yida syomkangiz bor!\\n📍 <b>To'yxona:</b> ${event.venue}\\nManzil: ${event.location}\\n\\nTayyorgarlik ko'ring! 📸`;
          sendNotification(op.telegramChatId, message);
        }
      }
    }
  } catch (error) {
    console.error("Cron error", error);
  }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
