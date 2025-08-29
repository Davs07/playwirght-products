import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://www.rol.com.pe/collection/cereales", {
    waitUntil: "domcontentloaded",
  });

  // 1. Recolectar links desde la página de categoría
  const links = await page.$$eval("a.bs-collection__product-info", (els) =>
    els.map((e) => new URL(e.getAttribute("href"), window.location.origin).href)
  );

  let productos = [];

  // 2. Recorrer cada link
  for (const link of links) {
    await page.goto(link, { waitUntil: "domcontentloaded" });

    const nombre = await page.$eval("h1.bs-product__title", (el) =>
      el.textContent.trim()
    );
    await page.waitForSelector("div.bs-product__sku");
    const sku = await page.$eval("div.bs-product__sku", (el) =>
      el.textContent.replace("SKU:", "").trim()
    );

    const imagen = await page.$eval("#bs-product-slider img", (el) =>
      el.getAttribute("src")
    );

    productos.push({ nombre, sku, imagen, url: link });
  }

  console.log(productos);

  await browser.close();
})();
