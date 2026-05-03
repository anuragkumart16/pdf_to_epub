import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFParser } from './parsers/pdf-parser';
import { EPUBGenerator } from './generators/epub-generator';

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join('/tmp', 'pdf-uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF files only
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * API key validation middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    console.error('API_KEY environment variable is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  if (apiKeyHeader !== expectedApiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

/**
 * Clean up uploaded file
 */
const cleanupFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
};

/**
 * POST /convert - Convert PDF to EPUB
 */
export const convertPdfToEpub = [
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    let uploadedFilePath: string | null = null;

    try {
      // Validate file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded. Please provide a file in the "pdf" field.' });
      }

      uploadedFilePath = req.file.path;

      // Validate file exists and has content
      if (!fs.existsSync(uploadedFilePath)) {
        return res.status(400).json({ error: 'Uploaded file not found' });
      }

      const fileStats = fs.statSync(uploadedFilePath);
      if (fileStats.size === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }

      console.log(`Processing PDF: ${req.file.originalname} (${fileStats.size} bytes)`);

      // Parse PDF
      const parser = new PDFParser();
      const text = await parser.parse(uploadedFilePath);

      if (!text || text.trim().length === 0) {
        return res.status(422).json({ error: 'No readable text found in the PDF file' });
      }

      console.log(`Extracted ${text.length} characters from PDF`);

      // Generate EPUB
      const generator = new EPUBGenerator();
      const timestamp = Date.now();
      const outputFilename = `${path.basename(req.file.originalname, '.pdf')}-${timestamp}.epub`;
      const outputPath = path.join('/tmp', 'epub-output', outputFilename);

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      await generator.generate(text, outputPath);

      // Verify output file exists
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: 'Failed to generate EPUB file' });
      }

      // Send EPUB as download
      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);

      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);

      // Clean up files after streaming
      fileStream.on('close', () => {
        cleanupFile(uploadedFilePath!);
        cleanupFile(outputPath);
      });

      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        cleanupFile(uploadedFilePath!);
        cleanupFile(outputPath);
      });

    } catch (error: any) {
      console.error('Conversion error:', error);

      // Clean up uploaded file on error
      if (uploadedFilePath) {
        cleanupFile(uploadedFilePath);
      }

      // Determine appropriate status code
      if (error.message?.includes('No readable text')) {
        return res.status(422).json({ error: 'No readable text found in the PDF file' });
      }

      if (error.message?.includes('PDF')) {
        return res.status(422).json({ error: 'Invalid or corrupted PDF file' });
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds 50MB limit' });
      }

      res.status(500).json({ 
        error: 'Internal server error during conversion',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
];

/**
 * Health check endpoint
 */
export const healthCheck = (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    service: 'PDF to EPUB Converter API',
    timestamp: new Date().toISOString()
  });
};