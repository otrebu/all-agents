---
depends:
  - "@context/blocks/construct/fastify.md"
---

# Fastify Binary and Non-JSON Responses

Serve binary data, files, HTML, and other non-JSON content types with Fastify.

## Content-Type Control

```typescript
import Fastify from "fastify";
import { readFile } from "node:fs/promises";

const server = Fastify({ logger: true });

// PDF response
server.get("/report.pdf", async function (request, reply) {
  const pdfBuffer = await readFile("./report.pdf");

  reply.type("application/pdf");
  return pdfBuffer;
});

// Image response
server.get("/chart.png", async function (request, reply) {
  const imageBuffer = await generateChart();

  reply.type("image/png");
  return imageBuffer;
});

// HTML response
server.get("/page", async function (request, reply) {
  reply.type("text/html");
  return "<html><body><h1>Hello</h1></body></html>";
});

// Plain text
server.get("/health", async function (request, reply) {
  reply.type("text/plain");
  return "OK";
});
```

## Content-Disposition Headers

```typescript
// Force download (attachment)
server.get("/download", async function (request, reply) {
  const fileBuffer = await readFile("./document.pdf");

  reply.type("application/pdf");
  reply.header("Content-Disposition", 'attachment; filename="document.pdf"');
  return fileBuffer;
});

// Inline display (browser renders if possible)
server.get("/view", async function (request, reply) {
  const pdfBuffer = await readFile("./report.pdf");

  reply.type("application/pdf");
  reply.header("Content-Disposition", 'inline; filename="report.pdf"');
  return pdfBuffer;
});
```

## Content-Length for Binary Data

```typescript
// Set Content-Length for known sizes
server.get("/file", async function (request, reply) {
  const fileBuffer = await readFile("./data.bin");
  const fileSizeBytes = fileBuffer.length;

  reply.type("application/octet-stream");
  reply.header("Content-Length", fileSizeBytes);
  return fileBuffer;
});
```

## Streaming Large Files

```typescript
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

// Stream files to avoid loading entire file in memory
server.get("/large-file", async function (request, reply) {
  const filePath = "./large-video.mp4";
  const stats = await stat(filePath);
  const fileSizeBytes = stats.size;

  reply.type("video/mp4");
  reply.header("Content-Length", fileSizeBytes);

  const stream = createReadStream(filePath);
  return reply.send(stream);
});

// Stream with range support (for video seeking)
server.get("/video", async function (request, reply) {
  const filePath = "./video.mp4";
  const stats = await stat(filePath);
  const fileSizeBytes = stats.size;

  const range = request.headers.range;

  if (!range) {
    reply.type("video/mp4");
    reply.header("Content-Length", fileSizeBytes);
    return reply.send(createReadStream(filePath));
  }

  // Parse range header (e.g., "bytes=0-1023")
  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const startByte = parseInt(startStr, 10);
  const endByte = endStr ? parseInt(endStr, 10) : fileSizeBytes - 1;
  const chunkSizeBytes = endByte - startByte + 1;

  reply.code(206); // Partial Content
  reply.type("video/mp4");
  reply.header("Content-Range", `bytes ${startByte}-${endByte}/${fileSizeBytes}`);
  reply.header("Accept-Ranges", "bytes");
  reply.header("Content-Length", chunkSizeBytes);

  const stream = createReadStream(filePath, { start: startByte, end: endByte });
  return reply.send(stream);
});
```

## Dynamic Binary Generation

```typescript
// Generate binary data on-the-fly
server.get("/qr-code", async function (request, reply) {
  const data = request.query.data as string;
  const qrBuffer = await generateQRCode(data);

  reply.type("image/png");
  return qrBuffer;
});

// CSV export
server.get("/export.csv", async function (request, reply) {
  const rows = await fetchData();
  const csv = rows.map((r) => `${r.id},${r.name}`).join("\n");

  reply.type("text/csv");
  reply.header("Content-Disposition", 'attachment; filename="export.csv"');
  return csv;
});
```

## Error Responses with Correct Content Types

```typescript
// Binary endpoints should return errors as JSON
server.get("/image", async function (request, reply) {
  try {
    const imageBuffer = await fetchImage();
    reply.type("image/png");
    return imageBuffer;
  } catch (error) {
    // Explicitly set JSON type for error responses
    reply.type("application/json");
    reply.code(500);
    return { error: "Failed to generate image" };
  }
});

// Use error handler for consistent error responses
server.setErrorHandler(function (error, request, reply) {
  request.log.error(error);

  // Always return JSON errors, even for binary endpoints
  reply.type("application/json");

  if (error.statusCode === 404) {
    reply.code(404).send({ error: "File not found" });
    return;
  }

  reply.code(500).send({ error: "Internal server error" });
});
```

## TypeScript Support

```typescript
import { FastifyRequest, FastifyReply } from "fastify";

interface DownloadParams {
  fileId: string;
}

server.get<{ Params: DownloadParams }>(
  "/download/:fileId",
  async function (request, reply) {
    const { fileId } = request.params; // Typed as string
    const fileBuffer = await fetchFile(fileId);

    reply.type("application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename="${fileId}.bin"`);
    return fileBuffer;
  }
);
```

## Common MIME Types

```typescript
// Documents
"application/pdf"           // PDF
"application/msword"        // Word (.doc)
"application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Word (.docx)

// Images
"image/png"                 // PNG
"image/jpeg"                // JPEG
"image/gif"                 // GIF
"image/webp"                // WebP
"image/svg+xml"             // SVG

// Video
"video/mp4"                 // MP4
"video/webm"                // WebM

// Audio
"audio/mpeg"                // MP3
"audio/ogg"                 // OGG

// Archives
"application/zip"           // ZIP
"application/x-tar"         // TAR

// Data
"text/csv"                  // CSV
"application/json"          // JSON
"application/xml"           // XML
"text/plain"                // Plain text
"text/html"                 // HTML

// Generic binary
"application/octet-stream"  // Unknown/generic binary
```

## Best Practices

**DO:**

- Use `reply.type()` before returning binary data
- Set `Content-Length` for known file sizes (helps clients show download progress)
- Use streaming for large files (avoids memory issues)
- Return JSON errors even from binary endpoints
- Use descriptive filenames in `Content-Disposition`
- Use `attachment` to force download, `inline` to display in browser

**DON'T:**

- Load large files entirely into memory (use streams)
- Forget to set Content-Type (defaults to JSON)
- Mix content types in error responses
- Serve files without proper headers
- Use generic `application/octet-stream` when specific type is known
