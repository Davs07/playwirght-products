import fs from 'fs';

async function standardizeSourceUrls() {
    try {
        console.log('Estandarizando sourceUrls para que siempre sea un array...\n');
        
        // Leer archivo filtrado deduplicado
        const data = JSON.parse(fs.readFileSync('./web-scrapping-products-28-08/productos_filtrados_deduplicados.json', 'utf8'));
        console.log(`Total de productos: ${data.length}`);
        
        let productsWithSourceUrl = 0;
        let productsWithSourceUrls = 0;
        let productsWithoutSource = 0;
        
        // Convertir todos los productos para que tengan sourceUrls como array
        const standardizedProducts = data.map(product => {
            const standardized = { ...product };
            
            if (product.sourceUrl && !product.sourceUrls) {
                // Producto con sourceUrl individual - convertir a array
                standardized.sourceUrls = [product.sourceUrl];
                delete standardized.sourceUrl;
                productsWithSourceUrl++;
            } else if (product.sourceUrls && Array.isArray(product.sourceUrls)) {
                // Ya tiene sourceUrls como array - mantener
                productsWithSourceUrls++;
            } else if (!product.sourceUrl && !product.sourceUrls) {
                // Sin URL de origen - añadir array vacío
                standardized.sourceUrls = [];
                productsWithoutSource++;
            }
            
            return standardized;
        });
        
        console.log('=== ESTADÍSTICAS DE CONVERSIÓN ===');
        console.log(`Productos con sourceUrl (convertidos): ${productsWithSourceUrl}`);
        console.log(`Productos con sourceUrls (mantenidos): ${productsWithSourceUrls}`);
        console.log(`Productos sin fuente (array vacío): ${productsWithoutSource}`);
        console.log(`Total procesados: ${standardizedProducts.length}`);
        
        // Guardar archivo corregido
        const outputPath = './web-scrapping-products-28-08/productos_filtrados_deduplicados.json';
        fs.writeFileSync(outputPath, JSON.stringify(standardizedProducts, null, 2));
        
        console.log(`\n✅ Archivo actualizado: ${outputPath}`);
        console.log('Ahora todos los productos tienen la propiedad "sourceUrls" como array.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

standardizeSourceUrls();
