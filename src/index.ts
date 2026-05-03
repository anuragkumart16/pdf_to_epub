// src/index.ts
import { PDFParser } from './parsers/pdf-parser';
import { EPUBGenerator } from './generators/epub-generator';
import fs from 'fs';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`Usage:
  npm run dev <input.pdf> [output.epub]
  npm start <input.pdf> [output.epub]

Arguments:
  input.pdf   Path to the PDF file to convert
  output.epub Path for the output EPUB file (optional, defaults to input.epub)

Examples:
  npm run dev ./book.pdf
  npm run dev ./book.pdf ./output.epub
  npm start ./book.pdf ./book.epub
`);
    process.exit(args.length === 0 ? 0 : 0);
  }

  const inputPath = args[0];
  let outputPath = args[1];

  // Validate input path
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Set default output path if not provided
  if (!outputPath) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    outputPath = path.join(path.dirname(inputPath), `${baseName}.epub`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log(`Converting: ${inputPath}`);
    console.log(`Output to:  ${outputPath}`);
    console.log('');

    // Parse PDF
    console.log('Step 1/2: Extracting text from PDF...');
    const parser = new PDFParser();
    const text = await parser.parse(inputPath);
    console.log(`         Extracted ${text.length} characters`);
    console.log('');

    // Generate EPUB
    console.log('Step 2/2: Generating EPUB...');
    const generator = new EPUBGenerator();
    await generator.generate(text, outputPath);
    console.log('');
    console.log('✅ Conversion complete!');
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
