const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const db = require("./database");

const app = express();
app.use(cors());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * =========================
 * SCRAPER (PRIZE AWARE)
 * =========================
 */
app.get("/sync", async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new"
    });

    const page = await browser.newPage();

    const baseUrl = "https://4dlotto.my/past-results";

    console.log("Opening:", baseUrl);

    await page.goto(baseUrl, {
      waitUntil: "networkidle2"
    });

    await delay(4000);

    /**
     * GET LINKS
     */
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href)
        .filter(h => h.includes("past-results"));
    });

    console.log("FOUND LINKS:", links.length);

    let allResults = [];

    /**
     * LOOP PAGES
     */
    for (const link of links.slice(0, 6)) {
      console.log("Scraping:", link);

      await page.goto(link, {
        waitUntil: "networkidle2"
      });

      await delay(3000);

      /**
       * PRIZE-AWARE SCRAPER
       */
      const results = await page.evaluate(() => {
        const items = [];
        let currentPrize = null;

        const nodes = document.querySelectorAll("div, tr, li, span, p");

        nodes.forEach(node => {
          const text = node.innerText?.trim();

          if (!text) return;

          // detect prize
          if (text.includes("1st")) currentPrize = "1st";
          else if (text.includes("2nd")) currentPrize = "2nd";
          else if (text.includes("3rd")) currentPrize = "3rd";

          const matches = text.match(/\b\d{4}\b/g);

          if (matches && currentPrize) {
            matches.forEach(num => {
              items.push({
                number: num,
                prize: currentPrize,
                raw: text
              });
            });
          }
        });

        return items;
      });

      console.log("FOUND:", results.length);

      allResults = allResults.concat(results);
    }

    await browser.close();

    console.log("TOTAL SCRAPED:", allResults.length);

    /**
     * SAVE TO DB
     */
    let inserted = 0;

    for (const item of allResults) {
      await new Promise(resolve => {
        db.run(
          `INSERT INTO results (draw, number, prize, draw_date)
           VALUES (?, ?, ?, ?)`,
          [
            "Magnum",
            item.number,
            item.prize,
            new Date().toISOString().split("T")[0]
          ],
          (err) => {
            if (!err) inserted++;
            resolve();
          }
        );
      });
    }

    res.json({
      success: true,
      total: allResults.length,
      inserted
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  } finally {
    if (browser) await browser.close();
  }
});

/**
 * =========================
 * HISTORY API (FRONTEND USES THIS)
 * =========================
 */
app.get("/history", (req, res) => {
  db.all(
    `SELECT * FROM results ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.json({
          success: false,
          error: err.message
        });
      }

      res.json(rows);
    }
  );
});

/**
 * START SERVER
 */
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
