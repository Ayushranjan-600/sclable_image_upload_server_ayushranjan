/**
 * Image Upload Server
 *
 * Express.js server that accepts image uploads via multipart/form-data,
 * validates them, and stores them in AWS S3. Designed to run as multiple
 * instances behind an NGINX load balancer.
 */

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { validateImage } = require('./validate');
const { uploadToS3 } = require('./upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer with memory storage (no disk writes)
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Logging middleware
 * Logs: [Server PORT] - METHOD /path - STATUS
 */
app.use((req, res, next) => {
    // Capture the response status after it finishes
    res.on('finish', () => {
        console.log(`[Server ${PORT}] - ${req.method} ${req.originalUrl} - ${res.statusCode}`);
    });
    next();
});

/**
 * GET /health
 * Health check endpoint — returns server status and port.
 */
app.get('/health', (req, res) => {
    try {
        return res.status(200).json({ status: 'ok', port: Number(PORT) });
    } catch (error) {
        return res.status(500).json({ error: `Health check failed: ${error.message}` });
    }
});

/**
 * POST /upload
 * Accepts a single image file (field name: "image") via multipart/form-data.
 * Validates the file, generates a unique filename, uploads to S3, and returns the URL.
 */
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        // Check if a file was included in the request
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided. Use field name "image".' });
        }

        // Validate the uploaded file
        const validation = validateImage(req.file);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Extract file extension from the original filename
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';

        // Generate a unique filename: timestamp-uuid.extension
        const uniqueFilename = `${Date.now()}-${uuidv4()}${ext}`;

        // Upload to S3
        const url = await uploadToS3(req.file.buffer, uniqueFilename, req.file.mimetype);

        return res.status(200).json({ url });
    } catch (error) {
        console.error(`[Server ${PORT}] Upload error:`, error.message);
        return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
});

/**
 * 404 handler — catch all unmatched routes
 */
app.use((req, res) => {
    return res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

/**
 * Global error handler
 */
app.use((err, req, res, _next) => {
    console.error(`[Server ${PORT}] Unhandled error:`, err.message);
    return res.status(500).json({ error: `Internal server error: ${err.message}` });
});

// Start the server only if this file is run directly (not imported by tests)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Server ${PORT}] Image upload server is running on port ${PORT}`);
    });
}

// Export the app for testing with supertest
module.exports = app;
