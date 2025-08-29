import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.rol.com.pe/collection/galletas', { waitUntil: 'domcontentloaded' });

  // Selecciona todos los productos
  const productos = await page.$$eval('div.bs-collection__product', items => {
    return items.map(item => {
      const link = item.querySelector('a.bs-collection__product-info')?.getAttribute('href');
      const nombre = item.querySelector('h3.bs-collection__product-title')?.textContent.trim();
      const precio = item.querySelector('strong.bs-collection__product-final-price')?.textContent.trim();

      return {
        nombre,
        precio,
        link: link ? new URL(link, window.location.origin).href : null
      };
    });
  });

  console.log(productos);

  await browser.close();
})();
