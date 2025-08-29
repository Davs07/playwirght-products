import fs from 'fs';

// Función para filtrar solo los campos necesarios
function filterProductFields(product) {
    return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        upc: product.upc,
        price: product.price,
        sourceImageUrl: product.sourceImageUrl,
        sourceUrl: product.sourceUrl
    };
}

// Función para agrupar productos por UPC
function groupByUpc(products) {
    const upcGroups = new Map();
    
    products.forEach(product => {
        if (!product.upc) return;
        
        if (!upcGroups.has(product.upc)) {
            upcGroups.set(product.upc, []);
        }
        upcGroups.get(product.upc).push(product);
    });
    
    return upcGroups;
}

// Función para fusionar productos duplicados
function mergeProducts(products) {
    if (products.length === 1) {
        return products[0];
    }
    
    // Separar productos por fuente
    const montaniaProducts = products.filter(p => p.id.startsWith('montania_'));
    const rolProducts = products.filter(p => p.id.startsWith('rol_'));
    
    // Configurar el producto base
    let mergedProduct = {};
    
    // Usar datos de Montaña como base (nombre y marca)
    const montaniaProduct = montaniaProducts[0];
    const rolProduct = rolProducts[0];
    
    if (montaniaProduct) {
        mergedProduct.id = montaniaProduct.id;
        mergedProduct.name = montaniaProduct.name;
        mergedProduct.brand = montaniaProduct.brand;
        mergedProduct.upc = montaniaProduct.upc;
        mergedProduct.sourceUrl = montaniaProduct.sourceUrl;
    } else {
        mergedProduct.id = rolProduct.id;
        mergedProduct.name = rolProduct.name;
        mergedProduct.brand = rolProduct.brand;
        mergedProduct.upc = rolProduct.upc;
        mergedProduct.sourceUrl = rolProduct.sourceUrl;
    }
    
    // Elegir el precio más barato
    const prices = products.map(p => p.price).filter(p => p && p > 0);
    mergedProduct.price = Math.min(...prices);
    
    // Preferir imagen de ROL, sino usar la de Montaña
    if (rolProduct && rolProduct.sourceImageUrl) {
        mergedProduct.sourceImageUrl = rolProduct.sourceImageUrl;
    } else if (montaniaProduct && montaniaProduct.sourceImageUrl) {
        mergedProduct.sourceImageUrl = montaniaProduct.sourceImageUrl;
    }
    
    // Agregar ambas sourceUrl si hay duplicados
    const sourceUrls = [];
    if (montaniaProduct) sourceUrls.push(montaniaProduct.sourceUrl);
    if (rolProduct) sourceUrls.push(rolProduct.sourceUrl);
    
    // Si hay múltiples fuentes, guardar ambas URLs
    if (sourceUrls.length > 1) {
        mergedProduct.sourceUrls = sourceUrls; // Array con ambas URLs
        delete mergedProduct.sourceUrl; // Eliminar la URL única
    }
    
    console.log(`Fusionando UPC ${mergedProduct.upc}:`);
    console.log(`  - Productos: ${products.length}`);
    console.log(`  - Nombre: ${mergedProduct.name}`);
    console.log(`  - Precio final: ${mergedProduct.price}`);
    console.log(`  - URLs: ${sourceUrls.length > 1 ? sourceUrls.join(', ') : mergedProduct.sourceUrl}`);
    console.log(`  - Imagen de: ${rolProduct ? 'ROL' : 'Montaña'}`);
    console.log('');
    
    return mergedProduct;
}

async function main() {
    try {
        console.log('Iniciando deduplicación filtrada...\n');
        
        // Leer archivo unificado
        const unifiedData = JSON.parse(fs.readFileSync('./web-scrapping-products-28-08/productos_unificados.json', 'utf8'));
        console.log(`Total de productos en archivo unificado: ${unifiedData.length}`);
        
        // Filtrar solo los campos necesarios
        const filteredProducts = unifiedData.map(filterProductFields);
        console.log(`Productos filtrados: ${filteredProducts.length}`);
        
        // Agrupar por UPC
        const upcGroups = groupByUpc(filteredProducts);
        console.log(`Grupos de UPC únicos: ${upcGroups.size}`);
        
        // Procesar duplicados
        const deduplicatedProducts = [];
        let duplicatesFound = 0;
        let duplicatesEliminated = 0;
        
        for (const [upc, products] of upcGroups) {
            if (products.length > 1) {
                duplicatesFound++;
                duplicatesEliminated += (products.length - 1);
                
                const mergedProduct = mergeProducts(products);
                deduplicatedProducts.push(mergedProduct);
            } else {
                // Producto único, agregar tal como está
                deduplicatedProducts.push(products[0]);
            }
        }
        
        // Agregar productos sin UPC
        const productsWithoutUpc = filteredProducts.filter(p => !p.upc);
        deduplicatedProducts.push(...productsWithoutUpc);
        
        console.log('=== RESUMEN DE DEDUPLICACIÓN ===');
        console.log(`Productos originales: ${filteredProducts.length}`);
        console.log(`Grupos duplicados encontrados: ${duplicatesFound}`);
        console.log(`Productos duplicados eliminados: ${duplicatesEliminated}`);
        console.log(`Productos sin UPC conservados: ${productsWithoutUpc.length}`);
        console.log(`Productos finales: ${deduplicatedProducts.length}`);
        console.log(`Reducción: ${(duplicatesEliminated / filteredProducts.length * 100).toFixed(1)}%`);
        
        // Guardar resultado
        const outputPath = './web-scrapping-products-28-08/productos_filtrados_deduplicados.json';
        fs.writeFileSync(outputPath, JSON.stringify(deduplicatedProducts, null, 2));
        
        console.log(`\n✅ Archivo guardado en: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main();
