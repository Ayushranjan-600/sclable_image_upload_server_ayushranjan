/**
 * Test Suite for Image Upload Server
 * Tests using Jest and supertest
 */

const request = require('supertest');
const app = require('../src/server');

// Mock the S3 upload module so tests don't make real AWS calls
jest.mock('../src/upload', () => ({
    uploadToS3: jest.fn().mockResolvedValue('https://mock-bucket.s3.amazonaws.com/mock-image.jpg')
}));

describe('Image Upload Server API', () => {

    // 1. GET /health returns 200 and { status: "ok" }
    describe('GET /health', () => {
        it('returns 200 and formatted health status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'ok',
                port: expect.any(Number)
            });
        });
    });

    // 2. POST /upload with no file returns 400
    describe('POST /upload', () => {
        it('returns 400 when no file is provided', async () => {
            const response = await request(app).post('/upload');
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('No image file provided');
        });

        // 3. POST /upload with a valid JPEG under 2MB returns 200 and a URL
        it('returns 200 and a URL for a valid image under 2MB', async () => {
            // Create a mock valid buffer (small string simulating image data)
            const mockImageBuffer = Buffer.from('mock valid image content');

            const response = await request(app)
                .post('/upload')
                .attach('image', mockImageBuffer, {
                    filename: 'test.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('url');
            expect(response.body.url).toBe('https://mock-bucket.s3.amazonaws.com/mock-image.jpg');
        });

        // 4. POST /upload with a file over 2MB returns 400 with error message
        it('returns 400 when a file is over 2MB', async () => {
            // Create a buffer larger than 2MB (2 * 1024 * 1024 = 2097152 bytes)
            // We do this dynamically by creating a large string
            const largeBuffer = Buffer.alloc(2097153, 'a');

            const response = await request(app)
                .post('/upload')
                .attach('image', largeBuffer, {
                    filename: 'large.jpg',
                    contentType: 'image/jpeg'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('too large');
        });

        // 5. POST /upload with a non-image file (e.g. .txt) returns 400 with error message
        it('returns 400 when uploaded file is not an image', async () => {
            const mockTextBuffer = Buffer.from('this is just text');

            const response = await request(app)
                .post('/upload')
                .attach('image', mockTextBuffer, {
                    filename: 'test.txt',
                    contentType: 'text/plain'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid file type');
        });
    });
});
