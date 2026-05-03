# PDF to EPUB Converter

A TypeScript-based command-line tool for converting PDF files to EPUB format. Extracts text from PDFs and generates properly formatted EPUB ebooks.

## Features

- Extract text content from PDF files using pdf-parse
- Generate standard EPUB 3.0 compliant ebooks
- Automatic chapter detection and table of contents generation
- Support for custom input and output file paths
- Development and production modes
- Built with TypeScript for type safety and maintainability

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
