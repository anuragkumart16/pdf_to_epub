// src/parsers/pdf-parser.ts
import fs from 'fs';
import pdfParse from 'pdf-parse';

export class PDFParser {
  async parse(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }
}