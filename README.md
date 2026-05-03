# PDF to EPUB Converter

A TypeScript-based command-line tool for converting PDF files to EPUB format. Extracts text from PDFs and generates properly formatted EPUB ebooks.

**Live API Endpoint:** The converter is deployed and available at `https://pdf-to-epub-8ykv.onrender.com`. This is the live API endpoint you can use for remote PDF-to-EPUB conversion. See the [API Server](#api-server) section below for usage details.

## Features

- Extract text content from PDF files using pdf-parse
- Generate standard EPUB 3.0 compliant ebooks
- Automatic chapter detection and table of contents generation
- Support for custom input and output file paths
- Development and production modes
- Built with TypeScript for type safety and maintainability
- REST API for remote PDF to EPUB conversion

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pdf_to_epub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## CLI Usage

### Build Command

Compile the TypeScript source to JavaScript:

```bash
npm run build
```

### Development Mode

Run the converter directly from TypeScript source (useful for development):

```bash
npm run dev <input.pdf> [output.epub]
```

### Production Mode

Run the compiled JavaScript version:

```bash
npm start <input.pdf> [output.epub]
```

## Arguments

### `input.pdf` (required)

Path to the PDF file you want to convert. Must be a valid path to an existing PDF file.

### `output.epub` (optional)

Path for the output EPUB file. If not provided, the tool will use the input filename with `.epub` extension in the same directory.

## Examples

Convert a PDF to EPUB with default output name:
```bash
npm run dev ./document.pdf
# Output: ./document.epub
```

Convert a PDF to EPUB with custom output path:
```bash
npm run dev ./docs/report.pdf ./output/report.epub
```

Use production mode after building:
```bash
npm run build
npm start ./book.pdf ./book.epub
```

Show help information:
```bash
npm run dev -- -h
# or
npm run dev -- --help
```

## API Server

The PDF to EPUB converter also includes a REST API server for remote conversion, allowing you to integrate PDF-to-EPUB functionality into web applications and services.

### API Overview

The API provides a simple REST interface for converting PDF files to EPUB format. It uses standard HTTP methods and returns JSON responses. The server is built with Express.js and supports file uploads via multipart/form-data.

Key features:
- **Health check endpoint** to verify server availability
- **Convert endpoint** for PDF to EPUB conversion
- **API key authentication** for secure access
- **Multipart file upload** for sending PDF files
- **JSON responses** with conversion status and download URLs

### Environment Setup

The API server requires the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_KEY` | Secret key for API authentication | - | Yes |
| `PORT` | Port number for the server to listen on | `3000` | No |

Create a `.env` file in the project root:

```bash
API_KEY=your-secret-api-key-here
PORT=3000
```

### API Usage

All API requests must include the `x-api-key` header for authentication (except the health check endpoint).

#### Health Check

Verifies that the API server is running and healthy.

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-03T10:02:48.000Z",
  "uptime": 1234.56
}
```

#### Convert PDF to EPUB

Converts an uploaded PDF file to EPUB format.

**Endpoint:** `POST /convert`

**Headers:**
- `x-api-key`: Your API key (required)
- `Content-Type`: `multipart/form-data` (automatically set by curl)

**Body:**
- `file`: The PDF file to convert (required, multipart file upload)

**Request:**
```bash
curl -X POST http://localhost:3000/convert \
  -H "x-api-key: your-secret-api-key-here" \
  -F "file=@/path/to/document.pdf" \
  -o document.epub
```

**Response (200 OK):**
The converted EPUB file is returned as a binary stream with `Content-Type: application/epub+zip`. The file is automatically saved to the specified output path (or uses the input filename with `.epub` extension).

**Alternative JSON Response (with metadata):**
```bash
curl -X POST http://localhost:3000/convert \
  -H "x-api-key: your-secret-api-key-here" \
  -F "file=@/path/to/document.pdf" \
  -H "Accept: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "PDF converted successfully",
  "data": {
    "originalFilename": "document.pdf",
    "outputFilename": "document.epub",
    "size": 1048576,
    "downloadUrl": "http://localhost:3000/download/document.epub"
  }
}
```

### Request/Response Examples

#### Example 1: Basic Conversion with File Download

```bash
# Convert PDF and save EPUB to file
curl -X POST http://localhost:3000/convert \
  -H "x-api-key: my-secret-key" \
  -F "file=@/home/user/documents/book.pdf" \
  -o /home/user/ebooks/book.epub
```

#### Example 2: Conversion with Custom Output Filename

```bash
# Specify output filename in the request
curl -X POST http://localhost:3000/convert \
  -H "x-api-key: my-secret-key" \
  -F "file=@report.pdf" \
  -F "outputFilename=annual_report.epub" \
  -o annual_report.epub
```

#### Example 3: Check Server Health

```bash
# Verify API is running
curl http://localhost:3000/health
```

#### Example 4: Conversion with JSON Response

```bash
# Get conversion metadata as JSON
curl -X POST http://localhost:3000/convert \
  -H "x-api-key: my-secret-key" \
  -F "file=@presentation.pdf" \
  -H "Accept: application/json" | jq
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | API key does not have permission |
| 404 | Not Found | Requested resource not found |
| 413 | Payload Too Large | Uploaded file exceeds size limit |
| 415 | Unsupported Media Type | Invalid file type (not a PDF) |
| 500 | Internal Server Error | Server-side error during conversion |
| 503 | Service Unavailable | Server is temporarily unavailable |

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid API key"
  }
}
```

**Common Error Scenarios:**

- **401 Unauthorized**: The `x-api-key` header is missing or incorrect
- **400 Bad Request**: No file was uploaded or the file field is missing
- **415 Unsupported Media Type**: The uploaded file is not a valid PDF
- **413 Payload Too Large**: The PDF file exceeds the maximum allowed size (default: 100MB)
- **500 Internal Server Error**: An error occurred during the conversion process

### Running the Server Locally

#### Development Mode

Run the API server with hot-reload for development:

```bash
npm run dev:api
```

The server will start on `http://localhost:3000` with automatic TypeScript compilation and reload on file changes.

#### Production Mode

1. Build the TypeScript source:
```bash
npm run build
```

2. Start the production server:
```bash
npm start:api
```

The server will start on the port specified in the `PORT` environment variable (default: 3000).

#### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start API server in development mode with hot-reload |
| `npm run start:api` | Start API server in production mode |
| `npm run build` | Build both CLI and API server |

### Deploy to Render

[Render](https://render.com) is a cloud platform for deploying web services. Follow these steps to deploy the API server:

#### Prerequisites

- A Render account (free tier available)
- The repository connected to your GitHub/GitLab/Bitbucket account

#### Deployment Steps

1. **Create a New Web Service**
   - Log in to your Render dashboard
   - Click **New** → **Web Service**
   - Select your repository from the list

2. **Configure the Service**
   - **Name**: `pdf-to-epub-api` (or your preferred name)
   - **Region**: Choose a region closest to your users
   - **Branch**: `main` (or your production branch)
   - **Runtime**: `Node 18` (or higher)
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:api`

3. **Set Environment Variables**
   - In the **Environment Variables** section, add:
     - `API_KEY`: Generate a secure random key (e.g., using `openssl rand -hex 32`)
     - `PORT`: `10000` (Render's default port)
   - Mark these as **Private** to keep them secure

4. **Configure Auto-Deploy (Optional)**
   - Enable **Auto-Deploy** to automatically deploy on push to the main branch
   - This is recommended for continuous deployment

5. **Deploy**
   - Click **Create Web Service**
   - Render will build and deploy your application
   - Monitor the deployment logs in the dashboard

6. **Verify Deployment**
   - Once deployed, visit your service URL (e.g., `https://pdf-to-epub-api.onrender.com`)
   - Test the health endpoint:
     ```bash
     curl https://pdf-to-epub-api.onrender.com/health
     ```

#### Using the Deployed API

After deployment, use your service URL for API requests:

```bash
# Health check
curl https://pdf-to-epub-api.onrender.com/health

# Convert a PDF
curl -X POST https://pdf-to-epub-api.onrender.com/convert \
  -H "x-api-key: your-api-key" \
  -F "file=@document.pdf" \
  -o document.epub
```

#### Environment Variables on Render

| Variable | Value | Notes |
|----------|-------|-------|
| `API_KEY` | Your secret key | Generate using `openssl rand -hex 32` |
| `PORT` | `10000` | Required by Render for web services |
| `NODE_ENV` | `production` | Set automatically by Render |

#### Scaling (Optional)

- **Free Tier**: 1 instance, 512MB RAM
- **Starter Tier**: $7/month, 1 instance, 1GB RAM
- **Scale horizontally** by adding more instances in the Render dashboard

#### Monitoring

- View logs in the Render dashboard
- Set up alerts for downtime or errors
- Monitor response times and error rates

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
