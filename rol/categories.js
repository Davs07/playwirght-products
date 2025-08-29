import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Cambia esta URL por la página principal donde están las categorías
  await page.goto("https://www.rol.com.pe/", { waitUntil: "domcontentloaded" });

  // Espera el menú de categorías
  await page.waitForSelector("ul.bs-header-nav");

  // Extrae todas las categorías y subcategorías
  const categorias = await page.$$eval("ul.bs-header-nav li", (items) => {
    function extraerCategorias(li) {
      // Nivel 1
      const enlaceLv1 = li.querySelector("a.bs-menu__lv1");
      if (!enlaceLv1) return null;

      const nombreLv1 = enlaceLv1.innerText.trim();
      const urlLv1 = enlaceLv1.getAttribute("href");
      const categoria = { nombre: nombreLv1, url: urlLv1, subcategorias: [] };

      // Nivel 2
      const subLv2 = li.querySelectorAll("a.bs-menu__lv2");
      subLv2.forEach((enlaceLv2) => {
        const nombreLv2 = enlaceLv2.innerText.trim();
        const urlLv2 = enlaceLv2.getAttribute("href");
        const subcatLv2 = { nombre: nombreLv2, url: urlLv2, subcategorias: [] };

        // Nivel 3
        const parentDiv = enlaceLv2.closest("div.dropdown__lv2");
        if (parentDiv) {
          const subLv3 = parentDiv.querySelectorAll("a.bs-menu__lv3");
          subLv3.forEach((enlaceLv3) => {
            subcatLv2.subcategorias.push({
              nombre: enlaceLv3.innerText.trim(),
              url: enlaceLv3.getAttribute("href"),
            });
          });
        }
        categoria.subcategorias.push(subcatLv2);
      });

      // Si no tiene subcategorías lv2, busca lv3 directos
      const subLv3Direct = li.querySelectorAll("a.bs-menu__lv3");
      subLv3Direct.forEach((enlaceLv3) => {
        categoria.subcategorias.push({
          nombre: enlaceLv3.innerText.trim(),
          url: enlaceLv3.getAttribute("href"),
        });
      });

      return categoria;
    }

    // Filtra solo los items que tienen categoría
    return Array.from(items)
      .map(extraerCategorias)
      .filter((c) => c && c.nombre && c.url);
  });

  // Guarda el resultado
  fs.writeFileSync("categorias_rol.json", JSON.stringify(categorias, null, 2), "utf-8");
  console.log(`Se guardaron ${categorias.length} categorías en categorias_rol.json`);

  await browser.close();
})();