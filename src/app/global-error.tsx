"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --ink: #1a1a1a;
                --paper: #faf9f7;
                --accent: #e85d04;
                --muted: #6b6b6b;
                --border: #e5e2dd;
                --surface: #ffffff;
              }
              body {
                margin: 0;
                background: var(--paper);
                color: var(--ink);
                font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
              }
              h1 {
                font-family: 'Playfair Display', ui-serif, Georgia, serif;
              }
            `,
          }}
        />
      </head>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: 0 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: "0.75rem", color: "var(--muted)" }}>
              An unexpected error occurred. Please try again.
            </p>
            <div
              style={{
                marginTop: "2.5rem",
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <button
                onClick={reset}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "0.75rem 2rem",
                  borderRadius: "9999px",
                  border: "none",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  padding: "0.75rem 2rem",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  fontSize: "1rem",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
