/**
 * S3 Upload Module
 *
 * Handles uploading file buffers to AWS S3 using the AWS SDK v3.
 * Reads credentials and configuration from environment variables.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client with credentials from environment variables
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads a file buffer to AWS S3.
 *
 * @param {Buffer} fileBuffer - The file contents as a Buffer.
 * @param {string} filename   - The destination filename (key) in the S3 bucket.
 * @param {string} mimetype   - The MIME type of the file (e.g. 'image/jpeg').
 * @returns {Promise<string>} The public URL of the uploaded object.
 * @throws {Error} If the upload fails.
 */
async function uploadToS3(fileBuffer, filename, mimetype) {
    try {
        const bucketName = process.env.S3_BUCKET_NAME;

        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is not set');
        }

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: fileBuffer,
            ContentType: mimetype,
        });

        await s3Client.send(command);

        // Construct and return the public S3 URL
        const url = `https://${bucketName}.s3.amazonaws.com/${filename}`;
        return url;
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
}

module.exports = { uploadToS3 };
