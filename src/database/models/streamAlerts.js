const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    Guild: String,
    Channel: String,
    Role: String,
    Streamer: String,
    IsLive: { type: Boolean, default: false },
});

module.exports = mongoose.model("streamAlerts", Schema);
