import { chromium } from "playwright";
import fs from "fs";

// Uso:
//   node scraper_detalle_montania.js [input.json] [output.json]
// Ejemplo:
//   node scraper_detalle_montania.js productos_montania.json detalles_montania.json
const INPUT = process.argv[2] || "montania/productos_montania.json";
const OUTPUT = process.argv[3] || "montania/detalles_montania.json";

// Lee URLs desde el JSON de entrada.
// Acepta:
//  - Array de objetos con { enlace, ... } (como tu ejemplo)
//  - Array de strings con URLs
function cargarUrls(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (Array.isArray(raw) && raw.length > 0) {
    if (typeof raw[0] === "string") {
      return [...new Set(raw)];
    }
    if (typeof raw[0] === "object") {
      return [
        ...new Set(
          raw
            .map((o) => o?.enlace || o?.url)
            .filter(Boolean)
        ),
      ];
    }
  }

  throw new Error(
    "Formato de entrada no reconocido. Esperaba un array de strings (URLs) o un array de objetos con campo 'enlace' o 'url'."
  );
}

// Carga resultados previos para reanudar
function cargarParciales(path) {
  try {
    if (fs.existsSync(path)) {
      const data = JSON.parse(fs.readFileSync(path, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

async function scrapeProducto(page, url) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!resp || !resp.ok()) {
    throw new Error(`Fallo de navegación: ${resp?.status()} ${resp?.statusText()}`);
  }

  // Espera nombre (estático) y el contenedor del SKU (dinámico pero presente en DOM)
  await page.waitForSelector("h6.ProductCard__name .productName, .productName.fn, .ProductCard__name .productName", {
    state: "attached",
    timeout: 15000,
  }).catch(() => {});
  await page.waitForSelector(".ProductCard__sku, .productReference", {
    state: "attached",
    timeout: 15000,
  }).catch(() => {});

  // Si el SKU tarda en llenarse, esperamos a que tenga dígitos o usamos fallback
  await page
    .waitForFunction(() => {
      const skuEl = document.querySelector(".ProductCard__sku .productReference, .productReference");
      const txt = (skuEl?.textContent || "").replace(/\D+/g, "");
      // Fallback: intentar extraer del bloque completo del SKU si no hay .productReference
      const skuWrapper = document.querySelector(".ProductCard__sku");
      const wrapperTxt = (skuWrapper?.textContent || "").replace(/\D+/g, "");
      return (txt && txt.length >= 6) || (wrapperTxt && wrapperTxt.length >= 6);
    }, { timeout: 15000 })
    .catch(() => {});

  const data = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const text = (sel) => q(sel)?.textContent?.trim() || null;
    const attr = (sel, a) => q(sel)?.getAttribute(a) || null;

    // Nombre
    const nombre =
      text("h6.ProductCard__name .productName") ||
      text(".productName.fn") ||
      text(".ProductCard__name .productName") ||
      null;

    // Marca
    const marca =
      text(".ProductCard__brand a.brand") ||
      text(".ProductCard__brand .brandName a") ||
      text(".ProductCard__brand") ||
      null;

    // SKU / Código de barras
    let codigo_barras =
      text(".ProductCard__sku .productReference") ||
      text(".productReference") ||
      null;

    if (!codigo_barras) {
      // Extrae dígitos del contenedor por si viene como "SKU: 7750..."
      const skuWrapper = text(".ProductCard__sku");
      if (skuWrapper) {
        const onlyDigits = skuWrapper.replace(/\D+/g, "");
        if (onlyDigits && onlyDigits.length >= 6) codigo_barras = onlyDigits;
      }
    }

    if (codigo_barras) {
      // Normaliza: solo dígitos
      const onlyDigits = codigo_barras.replace(/\D+/g, "");
      if (onlyDigits) codigo_barras = onlyDigits;
    }

    // Precio: construir "S/ X.XX" desde entero + sup.decimal
    const priceIntegerEl = q(".ProductCard__price__integer");
    const decimals = text(".decimal-price2") || "";
    let precio = null;
    if (priceIntegerEl) {
      // Ej: "S/ 6" + ".00" => "S/ 6.00"
      const base = priceIntegerEl.textContent.replace(/\s+/g, " ").trim();
      const dec = decimals.trim();
      precio = dec ? `${base}${dec}` : base;
      precio = precio.replace(/\s+/g, " ").trim();
    } else {
      // Fallbacks
      precio =
        text(".Showcase__salePrice") ||
        text(".only-list-price") ||
        null;
    }

    // Imagen principal: preferir meta og:image, luego imagen en tarjeta/acciones
    let imagen =
      attr('meta[property="og:image"]', "content") ||
      attr(".ProductCard__actions .product a img", "src") ||
      attr(".ProductCard__gallery img", "src") ||
      attr(".ProductCard__image img", "src") ||
      null;

    const url = window.location.href;

    return { nombre, marca, precio, codigo_barras, imagen, url };
  });

  return data;
}

(async () => {
  const urls = cargarUrls(INPUT);

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
      console.log(
        `[${i}/${pendientes.length}] OK -> ${info?.nombre || "(sin título)"} | Marca: ${info?.marca || "?"} | SKU/EAN: ${info?.codigo_barras || "?"}`
      );
    } catch (err) {
      console.warn(`[${i}/${pendientes.length}] ERROR -> ${url} | ${err?.message || err}`);
      resultados.push({
        nombre: null,
        marca: null,
        precio: null,
        codigo_barras: null,
        imagen: null,
        url,
        error: String(err?.message || err),
      });
    }

    // Guardado incremental cada 50 items
    if (i % 50 === 0) {
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