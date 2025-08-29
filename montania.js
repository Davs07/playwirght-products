import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let productos = [];
  const totalPages = 269; // Cambia si el número de páginas varía

  for (let i = 1; i <= totalPages; i++) {
    const url = `https://montania.innovacionfac.com/shop/products?page=${i}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Espera el grid de productos
    await page.waitForSelector("#results .product-container");

    // Extrae los datos de cada producto en la página
    const productosEnPagina = await page.$$eval(
      "#results .product-container",
      (els) =>
        els.map((el) => {
          const enlace = el.querySelector(".product-image a")?.href || null;
          const imagen = el.querySelector(".Showcase__photo img")?.src || null;
          const marca =
            el.querySelector("h2.product-name")?.innerText.trim() || null;
          const nombre =
            el.querySelector(".Showcase__name")?.innerText.trim() || null;
          return { enlace, imagen, marca, nombre };
        })
    );

    productos.push(...productosEnPagina);
    console.log(
      `Página ${i} scrapeada, productos: ${productosEnPagina.length}`
    );
  }

  fs.writeFileSync(
    "productos_montania.json",
    JSON.stringify(productos, null, 2),
    "utf-8"
  );

  console.log(productos);

  await browser.close();
})();
