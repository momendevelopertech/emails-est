import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class RootController {
    @Get()
    getRoot(@Res() res: Response) {
        res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SPHINX HR API</title>
    <style>
      :root { --ink: #0f172a; --accent: #1e3a5f; --muted: #64748b; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif;
        color: var(--ink);
        background: radial-gradient(1200px 400px at 10% 10%, #e2e8f0, transparent),
                    linear-gradient(135deg, #f8fafc, #eef2f7);
      }
      .card {
        max-width: 720px;
        margin: 10vh auto;
        background: #ffffff;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(30, 58, 95, 0.08);
      }
      .badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(30, 58, 95, 0.1);
        color: var(--accent);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      h1 { margin: 16px 0 8px; font-size: 28px; }
      p { margin: 6px 0; color: var(--muted); }
      a { color: var(--accent); text-decoration: none; font-weight: 600; }
      code {
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 6px;
        font-family: "JetBrains Mono", "Consolas", monospace;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">SPHINX HR API</span>
      <h1>API is running</h1>
      <p>Base path: <code>/api</code></p>
      <p>Swagger: <a href="/api/docs">/api/docs</a></p>
      <p>WebSocket: <code>/socket.io</code></p>
    </main>
  </body>
</html>`);
    }
}
