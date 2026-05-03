import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

/**
 * EPUB Generator - Creates valid EPUB 3.2 files from plain text
 */
export class EPUBGenerator {
  private readonly CHAPTER_SIZE = 2000; // characters per chapter

  async generate(text: string, outputPath: string): Promise<void> {
    console.log(`Generating EPUB from text (${text.length} chars) to ${outputPath}`);

    // Clean the text
    const cleanText = this.cleanText(text);

    // Split into chapters
    const chapters = this.splitIntoChapters(cleanText);
    console.log(`Split into ${chapters.length} chapters`);

    // Create a temporary build directory
    const buildDir = path.join(path.dirname(outputPath), `.epub-build-${Date.now()}`);
    fs.mkdirSync(buildDir, { recursive: true });

    try {
      // Create EPUB structure
      this.createMimetype(buildDir);
      this.createMetaInf(buildDir);
      const metadata = this.createMetadata();
      this.createOPF(buildDir, chapters, metadata);
      this.createTOC(buildDir, chapters, metadata);
      this.createCSS(buildDir);
      this.createChapters(buildDir, chapters);

      // Package everything into EPUB ZIP
      await this.packageEPUB(buildDir, outputPath);

      console.log(`EPUB generated successfully: ${outputPath}`);
    } finally {
      // Clean up build directory
      this.rmdirRecursive(buildDir);
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      // Replace multiple newlines with double newline (paragraph separator)
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Replace single newlines with space (line break within paragraph)
      .replace(/([^\n])\n([^\n])/g, '$1 $2')
      // Clean up extra spaces
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Split text into chapters
   */
  private splitIntoChapters(text: string): Array<{ id: string; title: string; content: string }> {
    const chapters: Array<{ id: string; title: string; content: string }> = [];
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

    let currentChapterContent: string[] = [];
    let currentChapterLength = 0;
    let chapterNum = 1;

    for (const para of paragraphs) {
      const paraLength = para.length;

      if (currentChapterLength > 0 && currentChapterLength + paraLength > this.CHAPTER_SIZE) {
        // Save current chapter
        chapters.push({
          id: `chapter-${chapterNum}`,
          title: `Chapter ${chapterNum}`,
          content: currentChapterContent.join('\n\n')
        });
        chapterNum++;
        currentChapterContent = [para];
        currentChapterLength = paraLength;
      } else {
        currentChapterContent.push(para);
        currentChapterLength += paraLength;
      }
    }

    // Save last chapter
    if (currentChapterContent.length > 0) {
      chapters.push({
        id: `chapter-${chapterNum}`,
        title: `Chapter ${chapterNum}`,
        content: currentChapterContent.join('\n\n')
      });
    }

    if (chapters.length === 0) {
      // If no chapters from splitting, create one chapter
      chapters.push({
        id: 'chapter-1',
        title: 'Chapter 1',
        content: text
      });
    }

    return chapters;
  }

  /**
   * Create mimetype file (must be first in archive, uncompressed)
   */
  private createMimetype(buildDir: string): void {
    const mimetypeDir = path.join(buildDir, 'META-INF');
    fs.mkdirSync(mimetypeDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'mimetype'), 'application/epub+zip', 'utf8');
  }

  /**
   * Create META-INF/container.xml
   */
  private createMetaInf(buildDir: string): void {
    const metaInfDir = path.join(buildDir, 'META-INF');
    fs.mkdirSync(metaInfDir, { recursive: true });

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;
    fs.writeFileSync(path.join(metaInfDir, 'container.xml'), containerXml, 'utf8');
  }

  /**
   * Generate metadata
   */
  private createMetadata() {
    const date = new Date().toISOString().split('T')[0];
    return {
      title: 'Converted eBook',
      language: 'en',
      identifier: `urn:uuid:${this.generateUUID()}`,
      date: date
    };
  }

  /**
   * Create OPF (Open Packaging Format) file
   */
  private createOPF(buildDir: string, chapters: Array<{ id: string; title: string; content: string }>, metadata: any): void {
    const oebpsDir = path.join(buildDir, 'OEBPS');
    fs.mkdirSync(oebpsDir, { recursive: true });

    const chapterRefs = chapters.map(ch => 
      `<itemref idref="${ch.id}" />`
    ).join('\n    ');

    const chapterManifest = chapters.map(ch => 
      `<item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml" />`
    ).join('\n    ');

    const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${this.escapeXml(metadata.title)}</dc:title>
    <dc:language>${metadata.language}</dc:language>
    <dc:identifier id="uid">${metadata.identifier}</dc:identifier>
    <dc:date>${metadata.date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}/, '')}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" properties="nav" media-type="application/xhtml+xml" />
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="style" href="style.css" media-type="text/css" />
${chapterManifest}
  </manifest>
  <spine toc="ncx">
    <itemref idref="toc" linear="no" />
${chapterRefs}
  </spine>
  <guide>
    <reference type="toc" href="toc.xhtml" title="Table of Contents" />
  </guide>
</package>
`;
    fs.writeFileSync(path.join(oebpsDir, 'content.opf'), opfContent, 'utf8');
  }

  /**
   * Create table of contents (XHTML and NCX)
   */
  private createTOC(buildDir: string, chapters: Array<{ id: string; title: string; content: string }>, metadata: any): void {
    const oebpsDir = path.join(buildDir, 'OEBPS');

    const chapterLinks = chapters.map(ch =>
      `<li><a href="${ch.id}.xhtml">${this.escapeXml(ch.title)}</a></li>`
    ).join('\n    ');

    const tocXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Table of Contents</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
    ${chapterLinks}
    </ol>
  </nav>
</body>
</html>
`;
    fs.writeFileSync(path.join(oebpsDir, 'toc.xhtml'), tocXhtml, 'utf8');

    // Also create NCX (legacy) TOC for compatibility
    const navPoints = chapters.map((ch, i) =>
      `    <navPoint id="${ch.id}-nav" playOrder="${i + 1}">
        <navLabel><text>${this.escapeXml(ch.title)}</text></navLabel>
        <content src="${ch.id}.xhtml" />
      </navPoint>`
    ).join('\n');

    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeXml(metadata.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`;
    fs.writeFileSync(path.join(oebpsDir, 'toc.ncx'), ncx, 'utf8');
  }

  /**
   * Create CSS stylesheet
   */
  private createCSS(buildDir: string): void {
    const oebpsDir = path.join(buildDir, 'OEBPS');

    const css = `/* EPUB Stylesheet */
@namespace epub "http://www.idpf.org/2007/ops";

body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.1em;
  line-height: 1.6;
  color: #222;
  max-width: 50em;
  margin: 2em auto;
  padding: 0 1.5em;
}

h1, h2, h3 {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: bold;
  color: #111;
  page-break-after: avoid;
}

h1 {
  font-size: 1.6em;
  text-align: center;
  margin-top: 2em;
  margin-bottom: 1.5em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.5em;
}

h2 {
  font-size: 1.3em;
  margin-top: 2em;
  margin-bottom: 1em;
}

p {
  text-align: justify;
  margin: 0.8em 0;
  text-indent: 1.5em;
}

p:first-child {
  text-indent: 0;
}

ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.5em 0;
}

nav[epub|type="toc"] {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}

nav[epub|type="toc"] h1 {
  font-size: 1.4em;
  text-align: left;
  border-bottom: 2px solid #333;
}

nav[epub|type="toc"] ol {
  list-style-type: none;
  padding-left: 0;
}

nav[epub|type="toc"] li {
  margin: 0.4em 0;
}

nav[epub|type="toc"] a {
  color: #0066cc;
  text-decoration: none;
}

nav[epub|type="toc"] a:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  body {
    color: #ddd;
    background-color: #1a1a1a;
  }
  h1, h2, h3 {
    color: #fff;
  }
  nav[epub|type="toc"] a {
    color: #66b3ff;
  }
}`;
    fs.writeFileSync(path.join(oebpsDir, 'style.css'), css, 'utf8');
  }

  /**
   * Create chapter XHTML files
   */
  private createChapters(buildDir: string, chapters: Array<{ id: string; title: string; content: string }>): void {
    const oebpsDir = path.join(buildDir, 'OEBPS');

    for (const chapter of chapters) {
      const paragraphs = chapter.content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
      const paraHtml = paragraphs.map(p => `    <p>${this.escapeXml(p)}</p>`).join('\n\n');

      const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${this.escapeXml(chapter.title)}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>${this.escapeXml(chapter.title)}</h1>
  </header>
${paraHtml}
</body>
</html>
`;
      fs.writeFileSync(path.join(oebpsDir, `${chapter.id}.xhtml`), chapterXhtml, 'utf8');
    }
  }

  /**
   * Package everything into EPUB ZIP file
   * mimetype must be first and stored (not compressed)
   */
  private packageEPUB(buildDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      }) as any;

      output.on('close', () => {
        const compressedSize = archive.pointer();
        console.log(`EPUB archive size: ${compressedSize} bytes`);
        resolve();
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // mimetype must be first and stored (uncompressed) per EPUB spec
      const mimetypePath = path.join(buildDir, 'mimetype');
      archive.file(mimetypePath, {
        name: 'mimetype',
        store: true // Store without compression
      });

      // Add META-INF directory
      archive.directory(path.join(buildDir, 'META-INF'), 'META-INF');

      // Add OEBPS directory
      archive.directory(path.join(buildDir, 'OEBPS'), 'OEBPS');

      archive.finalize();
    });
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Recursively delete a directory
   */
  private rmdirRecursive(dir: string): void {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          this.rmdirRecursive(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      fs.rmdirSync(dir);
    }
  }
}
