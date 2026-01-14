const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  accuracy: {
    type: Number,
    default: null // GPS accuracy in meters
  },
  speed: {
    type: Number,
    default: null // Speed in m/s
  },
  heading: {
    type: Number,
    default: null // Direction in degrees
  },
  altitude: {
    type: Number,
    default: null // Altitude in meters
  },
  address: {
    type: String,
    default: '' // Reverse geocoded address
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true // Whether this is the current active location
  },
  source: {
    type: String,
    enum: ['gps', 'network', 'manual'],
    default: 'gps'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  deviceInfo: {
    type: String,
    default: '' // Device model, OS version, etc.
  }
}, {
  timestamps: true
});

// Index for efficient queries
locationSchema.index({ employee: 1, timestamp: -1 });
locationSchema.index({ latitude: 1, longitude: 1 });
locationSchema.index({ isActive: 1, employee: 1 });

// Static method to get latest location for an employee
locationSchema.statics.getLatestLocation = async function(employeeId) {
  return this.findOne({ employee: employeeId, isActive: true })
    .sort({ timestamp: -1 });
};

// Static method to get location history for an employee
locationSchema.statics.getLocationHistory = async function(employeeId, startDate, endDate, limit = 100) {
  const query = { employee: employeeId };
  if (startDate && endDate) {
    query.timestamp = { $gte: startDate, $lte: endDate };
  }
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Instance method to deactivate old locations
locationSchema.methods.deactivateOldLocations = async function() {
  await this.constructor.updateMany(
    { employee: this.employee, _id: { $ne: this._id } },
    { isActive: false }
  );
};

module.exports = mongoose.model('Location', locationSchema);
