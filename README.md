# Image Upload Server

## 1. Project Overview
This project is a production-ready Express server that handles image uploads, streams them directly to an S3 bucket entirely in-memory, and provides robust validation without caching files onto the local disk. It is constructed to be stateless so it is highly available when deployed behind load balancer proxies.

### Architecture Diagram
```text
           +-------------+
           |             | GET /health
Client --> |    NGINX    |----------------+
           | (Port 80)   |                |
           +-------------+                v
                  |               +---------------+
                  | POST /upload  |               |
                  |                |   App 1       | --> AWS S3 (Client S3 SDK v3)
                  +--------------> | (Port 3001)   | 
                  |                +---------------+
                  |
                  |                +---------------+
                  | POST /upload  |               |
                  +--------------> |   App 2       | --> AWS S3 (Client S3 SDK v3)
                                   | (Port 3002)   |
                                   +---------------+
```

## 2. Prerequisites
*   **Node.js 18+** installed locally
*   **AWS Account** (Requires Access Key ID and Secret Access Key configured for writing to an S3 bucket)
*   **Docker & Docker Compose** (for multi-server and Nginx orchestration)
*   **NGINX** (If running locally, otherwise Docker handles this for you)

## 3. Setup Steps
1.  **Clone the repository.**
2.  **Install dependencies by running:**
    ```bash
    npm install
    # or `npm ci`
    ```
3.  **Setup environment variables.** Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
4.  **Fill in the AWS values in `.env`:**
    *   `AWS_ACCESS_KEY_ID`: Your AWS access key
    *   `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
    *   `AWS_REGION`: The region where your bucket sits (e.g., `us-east-1`)
    *   `S3_BUCKET_NAME`: The name of your S3 target bucket

## 4. How to Run Multiple Instances

**Instance 1 (Terminal Window 1)**
```bash
npm run start:3001
```

**Instance 2 (Terminal Window 2)**
```bash
npm run start:3002
```
Now both processes are actively running entirely disjoint. To access them through a round-robin connection locally, you must map an NGINX config.

## 5. NGINX Configuration Explained
The `nginx/nginx.conf` sets up an upstream array and a server listener:
*   `upstream backend { ... }`: This defines an internal `backend` proxy label mapping to `app1:3001` and `app2:3002`. Setting multiple servers with no weighting causes a standard round-robin connection balancing setup.
*   `listen 80;`: The NGINX server absorbs requests on standard HTTP port 80.
*   `client_max_body_size 10M`: Raises the maximum payload NGINX permits to match our server expectations for uploads.
*   `proxy_pass http://backend;`: Passes matched `/health` and `/upload` traffic to either `app1` or `app2`.
*   `proxy_set_header ...`: Maps host details natively to the backend processes.

## 6. Docker Setup
To run all 3 services via Docker Compose instantly:

```bash
docker-compose up --build
```
This spawns:
*   `app1` internally mapped into network mapping
*   `app2` internally mapped into network mapping
*   `nginx` listening on host machine port `80` targeting both internally

## 7. GitHub Actions Explanation
The CI `.github/workflows/ci.yml` validates commits through the following phases:
1.  **`actions/checkout@v3`**: Clones the repo directly inside an Ubuntu ephemeral environment.
2.  **`actions/setup-node@v3`**: Grabs Node Runtime v18 + native caching to streamline npm installs.
3.  **`npm ci`**: Installs fresh dependency graph.
4.  **`npm run lint`**: Makes sure no bad JS syntax/patterns exist via ESLint.
5.  **`npm test`**: Exercises the Jest framework suite validating validation boundaries.
6.  **`node src/server.js & sleep 3 && curl -f http://localhost:3001/health`**: Tests basic integration startability on a single daemon node.

AWS Secrets injected to the runner pipeline via Github Actions variables control environment hydration securely. The workflow entirely fails if any single process breaks or produces a nonzero exist-code.

## 8. API Reference

### `POST /upload`
Uploads a new valid image buffer.
*   **Request Format**: `multipart/form-data`
*   **Validation Rules**: Form-key **must** be `image`. Maximum Size is 2MB (`2097152 bytes`). Supported Types: `image/jpeg`, `image/png`.
*   **Success Response** (200 OK):
    ```json
    { "url": "https://<bucket>.s3.amazonaws.com/<filename>" }
    ```
*   **Error Responses** (400 Bad Request / 500 Internal Error):
    ```json
    { "error": "Descriptive validation or AWS fault message" }
    ```

### `GET /health`
Inquires health statuses of targeted App container ping.
*   **Response Format** (200 OK):
    ```json
    { "status": "ok", "port": 3001 } // Port shows which instance caught request!
    ```

## 9. Sample curl Commands

**Upload a valid image through NGINX (Port 80):**
```bash
curl -F "image=@/pathtoyour/test.jpg" http://localhost/upload
```

**Upload through direct instance (E.g. Port 3002):**
```bash
curl -F "image=@/pathtoyour/test.jpg" http://localhost:3002/upload
```

**Health check through NGINX (Port 80):**
```bash
curl http://localhost/health
```

## 10. Load Balancing Verification
In a dual-running CLI or docker-compose execution, you will see HTTP `GET /health` responding with an alternating Port log output. The NGINX default is to perfectly load-balance connections 1-to-1 against upstream definitions.
You check your terminal instances running `npm run start:3001` and `npm run start:3002`; you will see logs showing alternately. Docker output will print logs that prefix `[Server 3001]` then `[Server 3002]`.

## 11. Troubleshooting
*   **No valid credentials fault (`AWS_ACCESS_KEY_ID invalid`)**: Verify your AWS S3 bucket has permissions targeting PutObject, or ensure `docker-compose` `.env` references match exactly with the provided sample values locally.
*   **App crashes out because S3 is missing**: The Server app intentionally crashes if the `.env` values are not seeded locally.
*   **NGINX 502 Bad Gateway**: This means your backend instances aren't up! `nginx` proxy\_pass targets won't complete. Fix the app instances to come alive first. 
