const mongoose = require('mongoose');

const visualizationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    objects: {
        type: Array,
        default: []
    },
    explanation: {
        type: String,
        default: ''
    },
    animation: {
        type: Object,
        default: {}
    },
    view: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
visualizationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Visualization', visualizationSchema);
