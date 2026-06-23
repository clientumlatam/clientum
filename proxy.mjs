import http from "http";
import httpProxy from "http-proxy";

const VITE_PORT = parseInt(process.env.VITE_PORT ?? "21496", 10);
const API_PORT = parseInt(process.env.API_PORT ?? "8080", 10);
const MOCKUP_PORT = parseInt(process.env.MOCKUP_PORT ?? "8081", 10);
const PORT = parseInt(process.env.PROXY_PORT ?? "5000", 10);

const proxy = httpProxy.createProxy();

const server = http.createServer((req, res) => {
  const isApi = req.url?.startsWith("/api");
  const isMockup = req.url?.startsWith("/__mockup");
  const target = isApi
    ? `http://localhost:${API_PORT}`
    : isMockup
      ? `http://localhost:${MOCKUP_PORT}`
      : `http://localhost:${VITE_PORT}`;

  proxy.web(req, res, { target }, (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502);
    res.end("Proxy error");
  });
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: `http://localhost:${VITE_PORT}` });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on :${PORT} → API :${API_PORT}  Vite :${VITE_PORT}`);
});
