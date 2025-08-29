import { chromium } from "playwright";
import fs from "fs";

// Carga el JSON de categorías
const categorias = JSON.parse(fs.readFileSync("rol/categorias_rol.json", "utf-8"));

// Función para aplanar todas las subcategorías con URL real
function extraerTodasLasCategorias(categorias) {
  let resultado = [];
  for (const cat of categorias) {
    if (cat.url && cat.url !== "#") {
      resultado.push({ nombre: cat.nombre, url: cat.url });
    }
    if (cat.subcategorias && cat.subcategorias.length > 0) {
      resultado = resultado.concat(extraerTodasLasCategorias(cat.subcategorias));
    }
  }
  return resultado;
}

const categoriasValidas = extraerTodasLasCategorias(categorias);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let resumenCategorias = [];

  for (const categoria of categoriasValidas) {
    console.log(`Scrapeando categoría: ${categoria.nombre}`);
    let productos = [];
    let pagina = 1;
    let hayMasPaginas = true;

    while (hayMasPaginas) {
      // Cambia la URL según el patrón de paginación del sitio
      const urlPagina = pagina === 1
        ? `https://www.rol.com.pe${categoria.url}`
        : `https://www.rol.com.pe${categoria.url}?page=${pagina}`;

      await page.goto(urlPagina, { waitUntil: "domcontentloaded" });

      // Espera productos o termina si no hay
      const productosEnPagina = await page.$$eval(
        "a.bs-collection__product-info",
        els => els.map(e => ({
          nombre: e.querySelector(".bs-collection__product-title")?.innerText.trim() ?? null,
          url: new URL(e.getAttribute("href"), window.location.origin).href
        }))
      );

      // Si no hay productos, termina la paginación
      if (productosEnPagina.length === 0) {
        hayMasPaginas = false;
      } else {
        productos.push(...productosEnPagina);
        pagina++;
      }
    }

    resumenCategorias.push({
      categoria: categoria.nombre,
      url_categoria: `https://www.rol.com.pe${categoria.url}`,
      productos
    });

    console.log(`→ ${productos.length} productos encontrados en "${categoria.nombre}"`);
  }

  // Guarda todos los productos organizados por categoría
  fs.writeFileSync("productos_por_categoria.json", JSON.stringify(resumenCategorias, null, 2), "utf-8");
  console.log("Scraping finalizado. Resultados guardados en productos_por_categoria.json");

  await browser.close();
})();