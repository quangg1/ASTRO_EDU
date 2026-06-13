const mongoose = require('mongoose');

const astronomyEventReminderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    remindAt: { type: Date, required: true, index: true },
    notifiedAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

astronomyEventReminderSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('AstronomyEventReminder', astronomyEventReminderSchema);
