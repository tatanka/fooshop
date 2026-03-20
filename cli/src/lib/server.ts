import * as http from "http";
import * as net from "net";
import { URL } from "url";

export type CallbackResult =
  | { key: string; email: string }
  | { error: string };

interface ServerHandle {
  port: number;
  promise: Promise<CallbackResult>;
  close: () => void;
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", reject);
  });
}

export async function startCallbackServer(): Promise<ServerHandle> {
  const port = await findFreePort();

  let resolvePromise: (result: CallbackResult) => void;
  const promise = new Promise<CallbackResult>((resolve) => {
    resolvePromise = resolve;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://127.0.0.1:${port}`);

    if (url.pathname !== "/callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><h1>Authentication denied.</h1><p>You can close this tab.</p></body></html>");
      resolvePromise({ error });
      return;
    }

    const key = url.searchParams.get("key");
    const email = url.searchParams.get("email");

    if (!key || !email) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing key or email parameter");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<html><body><h1>&#10003; Authentication complete.</h1><p>You can close this tab and return to your terminal.</p></body></html>"
    );

    resolvePromise({ key, email });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const close = () => {
    server.close();
  };

  return { port, promise, close };
}
