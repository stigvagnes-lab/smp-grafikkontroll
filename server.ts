import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // State for the overlay (which graphic is active)
  let overlayState = {
    activeGraphic: "none", // "none", "sunnmore-map", "weather-widget", "super"
    showWeather: true,
    showWind: true,
    showTemp: true,
    showBackground: false,
    showWidget: false,
    showSmpLogo: false,
    smpLogoUrl: "/smp-logo.png",
    mapTileProvider: "esri", // "esri", "kartverket", "osm"
    superName: "Navn",
    superTitle: "Tittel",
  };

  const LOCATIONS = [
    { name: "Ålesund", lat: 62.4722, lon: 6.1549, offsetX: 0, offsetY: -20 },
    { name: "Ulsteinvik", lat: 62.34, lon: 5.85, offsetX: 20, offsetY: 0 },
    { name: "Molde", lat: 62.70, lon: 7.16, offsetX: 0, offsetY: 0 },
    { name: "Volda", lat: 62.15, lon: 6.07, offsetX: 0, offsetY: 20 },
    { name: "Fosnavåg", lat: 62.36, lon: 5.35, offsetX: -20, offsetY: 0 },
    { name: "Brattvåg", lat: 62.60, lon: 6.55, offsetX: 0, offsetY: 0 },
    { name: "Stranda", lat: 62.31, lon: 6.94, offsetX: 0, offsetY: 0 },
    { name: "Geiranger", lat: 62.10, lon: 7.20, offsetX: 0, offsetY: 0 },
    { name: "Vigra", lat: 62.60, lon: 6.00, offsetX: 0, offsetY: 0 },
    { name: "Sykkylven", lat: 62.39, lon: 6.58, offsetX: 0, offsetY: 0 },
  ];

  app.use(express.json());

  // Add headers for OBS Studio and other external viewers
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  // Valid and unique User-Agent compliant with MET.no TOS (Identification + site + contact email)
  const MET_USER_AGENT = "Sunnmoersposten-Grafikk/1.0 (https://www.smp.no; stig.vagnes@gmail.com)";

  // API to get current weather for Sunnmøre (Ålesund)
  app.get("/api/weather", async (req, res) => {
    try {
      const lat = req.query.lat || 62.4722;
      const lon = req.query.lon || 6.1549;
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
      
      const response = await axios.get(url, {
        headers: {
          "User-Agent": MET_USER_AGENT,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching weather:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // API to get weather for all map locations
  app.get("/api/weather/map", async (req, res) => {
    try {
      const weatherData = await Promise.all(
        LOCATIONS.map(async (loc) => {
          try {
            const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${loc.lat}&lon=${loc.lon}`;
            const response = await axios.get(url, {
              headers: {
                "User-Agent": MET_USER_AGENT,
              },
              timeout: 5000,
            });
            return {
              name: loc.name,
              lat: loc.lat,
              lon: loc.lon,
              offsetX: loc.offsetX,
              offsetY: loc.offsetY,
              data: response.data,
            };
          } catch (err) {
            console.error(`Error fetching weather for ${loc.name}:`, err.message);
            return null;
          }
        })
      );
      res.json(weatherData.filter(d => d !== null));
    } catch (error) {
      console.error("Error fetching map weather:", error);
      res.status(500).json({ error: "Failed to fetch map weather data" });
    }
  });

  // API to get/set overlay state
  app.get("/api/overlay/state", (req, res) => {
    res.json(overlayState);
  });

  app.post("/api/overlay/state", (req, res) => {
    overlayState = { ...overlayState, ...req.body };
    res.json(overlayState);
  });

  // API to download complete project source code as a ZIP
  app.get("/api/download-zip", (req, res) => {
    const zipPath = path.join(process.cwd(), "smp-vaergrafikk-kildekode.zip");
    execFile("python3", [path.join(process.cwd(), "export_zip.py"), zipPath], (error) => {
      if (error) {
        console.error("Error creating zip archive:", error);
        return res.status(500).json({ error: "Feil under oppretting av zip-arkiv" });
      }
      res.download(zipPath, "smp-vaergrafikk-kildekode.zip", (err) => {
        if (err) console.error("Error sending zip:", err);
      });
    });
  });

  // Serve from dist if it exists, otherwise use Vite middleware
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath);

  if (hasDist) {
    console.log("Serving from dist directory");
    app.use(express.static(distPath));
    
    // Explicitly handle /overlay and other SPA routes
    app.get(['/overlay', '/overlay/'], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    // Catch-all for other routes
    app.get('*', (req, res, next) => {
      // If it's an API route, let it fall through (though they are defined above)
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log("Using Vite middleware for development");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
