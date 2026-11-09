const { createServer } = require("node:http");
const next = require("next");

// cPanel/Passenger starts this file from the application root.
process.chdir(__dirname);

const port = Number.parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (request, response) => {
    try {
      await handle(request, response);
    } catch (error) {
      console.error("Request failed:", error);
      if (!response.headersSent) response.statusCode = 500;
      if (!response.writableEnded) response.end("Internal Server Error");
    }
  });

  // Passenger intercepts listen() and provides its own socket when hosted in cPanel.
  server.listen(port, "127.0.0.1", () => console.log(`DLA AC listening on port ${port}`));
}).catch((error) => {
  console.error("Unable to start DLA AC:", error);
  process.exitCode = 1;
});
