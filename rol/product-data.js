import { chromium } from "playwright";
import fs from "fs";

// Uso: node scraper_detalle_producto.js [input.json] [output.json]
// - input.json puede ser:
//   a) salida de productos_por_categoria.json (array de categorías con productos[{url}])
//   b) array de strings con URLs
//   c) array de objetos { url: "..." }
const INPUT = process.argv[2] || "rol/productos_por_categoria.json";
const OUTPUT = process.argv[3] || "rol/detalles_productos.json";

// -------- Utilidades de entrada/salida --------
function cargarUrls(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // 1) productos_por_categoria.json -> [{ categoria, url_categoria, productos: [{url, nombre}]}]
  if (Array.isArray(raw) && raw.length && raw[0]?.productos) {
    return [
      ...new Set(
        raw.flatMap((cat) =>
          (cat.productos || [])
            .map((p) => (typeof p === "string" ? p : p?.url))
            .filter(Boolean)
        )
      ),
    ];
  }

  // 2) Array de strings (urls)
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return [...new Set(raw)];
  }

  // 3) Array de objetos con {url}
  if (Array.isArray(raw) && typeof raw[0] === "object") {
    return [...new Set(raw.map((o) => o?.url).filter(Boolean))];
  }

  throw new Error(
    "Formato de entrada no reconocido. Usa: array de strings, array de objetos {url}, o salida de productos_por_categoria.json"
  );
}

function cargarParciales(path) {
  try {
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

// -------- Scraper de un producto --------
async function scrapeProducto(page, url) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!resp || !resp.ok()) {
    throw new Error(`Fallo de navegación: ${resp?.status()} ${resp?.statusText()}`);
  }

  // Título debería estar estático
  await page.waitForSelector("h1.bs-product__title, [data-bs='product.detail'] h1", {
    state: "visible",
    timeout: 15000,
  });

  // Único contenido dinámico: SKU
  await page.waitForSelector(".bs-product__sku, [data-bs='product.sku']", {
    state: "attached",
    timeout: 15000,
  });

  // Extraer datos
  const data = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const text = (sel) => q(sel)?.textContent?.trim() || null;
    const attr = (sel, a) => q(sel)?.getAttribute(a) || null;

    const nombre =
      text("h1.bs-product__title") ||
      text("[data-bs='product.detail'] h1") ||
      null;

    let sku =
      text(".bs-product__sku") ||
      text("[data-bs='product.sku']") ||
      null;
    sku = sku ? sku.replace(/SKU:\s*/i, "").trim() : null;

    // Precio: normalmente estático en el DOM
    const precio =
      text("[data-bs='product.finalPrice']") ||
      text(".bs-product__final-price") ||
      null;

    // Imagen principal (slider)
    let imagen =
      attr("#bs-product-slider img", "src") ||
      attr(".bs-img-square img", "src") ||
      attr("#bs-product-slider img", "data-src") ||
      null;

    // URL absoluta del producto
    const url = window.location.href;

    return { nombre, sku, precio, imagen, url };
  });

  // Normalización opcional del precio (extrae número), por si lo quieres
  // const precioNumero = data.precio ? Number((data.precio.replace(/[^\d.,]/g, "").replace(",", "."))) : null;

  return data;
}

// -------- Runner --------
(async () => {
  const urls = cargarUrls(INPUT);

  // Reanudar si hay parciales
  const parciales = cargarParciales(OUTPUT);
  const yaScrapeadas = new Set(parciales.map((p) => p.url));
  const pendientes = urls.filter((u) => !yaScrapeadas.has(u));

  console.log(`Total URLs: ${urls.length}. Ya procesadas: ${yaScrapeadas.size}. Pendientes: ${pendientes.length}.`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const resultados = [...parciales];

  let i = 0;
  for (const url of pendientes) {
    i++;
    try {
      const info = await scrapeProducto(page, url);
      resultados.push(info);
      console.log(`[${i}/${pendientes.length}] OK -> ${info?.nombre || "(sin título)"} | ${url}`);
    } catch (err) {
      console.warn(`[${i}/${pendientes.length}] ERROR -> ${url} | ${err?.message || err}`);
      resultados.push({ nombre: null, sku: null, precio: null, imagen: null, url, error: String(err?.message || err) });
    }

    // Guardado incremental cada 20 items
    if (i % 20 === 0) {
      fs.writeFileSync(OUTPUT, JSON.stringify(resultados, null, 2), "utf-8");
      console.log(`Guardado incremental: ${i} items.`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(resultados, null, 2), "utf-8");
  console.log(`Listo. Guardados ${resultados.length} registros en ${OUTPUT}`);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});