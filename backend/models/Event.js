const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  venue: { type: String, required: true },
  cameraCount: { type: Number, required: true, default: 1 },
  assignedOperators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  clientName: { type: String, default: '' },
  clientPhone: { type: String, default: '' },
  budget: { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 },
  status: { type: String, enum: ['Kutilmoqda', 'Syomka qilindi', 'Montajda', 'Tayyor', 'Topshirildi'], default: 'Kutilmoqda' },
  videoLink: { type: String, default: '' },
  comment: { type: String, default: '' },
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
