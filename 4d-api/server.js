const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const db = require("./database");

const app = express();
app.use(cors());

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * =========================
 * SCRAPER
 * =========================
 */
app.get("/sync", async (req, res) => {

  let browser;

  try {

    browser = await puppeteer.launch({
      headless: "new"
    });

    const page = await browser.newPage();

    // last 26 days
    const dates = Array.from({ length: 26 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);

      return d.toISOString().split("T")[0];
    });

    let all = [];

    for (const date of dates) {

      const url = `https://4dlotto.my/past-results/${date}`;
      console.log("Opening:", url);

      try {

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 60000
        });

        await delay(2000);

        const results = await page.evaluate((drawDate) => {

          const items = [];
          let currentPrize = null;

          const nodes = document.querySelectorAll("div, tr, li, span, p");

          nodes.forEach(n => {

            const text = n.innerText?.trim();
            if (!text) return;

            // prize detection
            if (text.includes("1st")) currentPrize = "1st";
            else if (text.includes("2nd")) currentPrize = "2nd";
            else if (text.includes("3rd")) currentPrize = "3rd";

            // STRICT FILTER: remove years (IMPORTANT FIX)
            const matches = text.match(/\b\d{4}\b/g)?.filter(num => {
              const n = parseInt(num);

              // remove years like 1900–2100
              if (n >= 1900 && n <= 2100) return false;

              return true;
            });

            if (matches && currentPrize) {

              matches.forEach(num => {

                items.push({
                  operator: "Magnum",
                  draw_date: drawDate,
                  prize: currentPrize,
                  position:
                    currentPrize === "1st" ? 1 :
                    currentPrize === "2nd" ? 2 :
                    currentPrize === "3rd" ? 3 : null,
                  number: num
                });

              });

            }

          });

          return items;

        }, date);

        console.log(`FOUND ${results.length} for ${date}`);

        all = all.concat(results);

      } catch (e) {
        console.log("SKIP:", date);
      }

    }

    await browser.close();

    console.log("TOTAL:", all.length);

    let inserted = 0;

    for (const item of all) {

      await new Promise(resolve => {

        db.run(
          `INSERT INTO results (operator, draw_date, prize, position, number)
           VALUES (?, ?, ?, ?, ?)`,
          [
            item.operator,
            item.draw_date,
            item.prize,
            item.position,
            item.number
          ],
          (err) => {

            if (err) {
              console.log("DB ERROR:", err.message);
            } else {
              inserted++;
            }

            resolve();

          }
        );

      });

    }

    res.json({
      success: true,
      total: all.length,
      inserted
    });

  } catch (err) {

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
 * HISTORY API
 * =========================
 */
app.get("/history", (req, res) => {

  db.all(
    `SELECT * FROM results ORDER BY draw_date DESC, created_at DESC`,
    [],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }

      res.json({
        success: true,
        count: rows.length,
        data: rows
      });

    }
  );

});

/**
 * START SERVER
 */
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
