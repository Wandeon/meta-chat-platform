import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  networkCondition: string;
  bundleSize: number;
  gzipSize: number;
  loadTime: number;
  dcl: number; // DOMContentLoaded
  fcp: number; // First Contentful Paint
}

async function runPerformanceTest() {
  const browser = await chromium.launch();
  const context = await browser.createContext();

  const metrics: PerformanceMetrics[] = [];

  // Test with different network conditions
  const networkProfiles = [
    { name: 'Slow 3G', downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 400 },
    { name: 'Fast 3G', downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
    { name: 'No Throttle', downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
  ];

  // Read bundle sizes
  const distPath = path.join(__dirname, 'dist');
  const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const gzipped = require('child_process').execSync(`gzip -9 < "${filePath}" | wc -c`).toString().trim();

    console.log(`File: ${file}, Size: ${(stats.size / 1024).toFixed(2)}KB, Gzipped: ${(parseInt(gzipped) / 1024).toFixed(2)}KB`);
  }

  // Test load times with simulated network conditions
  for (const profile of networkProfiles) {
    const page = await context.newPage();

    // Set network condition
    if (profile.latency > 0) {
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), profile.latency);
      });
    }

    // Start timing
    const startTime = Date.now();

    // Navigate to test page (would need a real test page)
    console.log(`\nTesting with ${profile.name}...`);
    console.log(`Latency: ${profile.latency}ms`);

    // Simulate loading the widget script
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Widget Test</title>
      </head>
      <body>
        <div id="widget-container"></div>
        <script src="./dist/widget.js"></script>
      </body>
      </html>
    `;

    await page.setContent(content);

    // Wait for widget to load
    try {
      await page.waitForFunction(() => window.MetaChatWidget !== undefined, { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      console.log(`✓ Widget loaded in ${loadTime}ms`);
    } catch (error) {
      console.log(`✗ Widget failed to load: ${error}`);
    }

    await page.close();
  }

  await context.close();
  await browser.close();
}

// Run the test
runPerformanceTest().catch(console.error);
