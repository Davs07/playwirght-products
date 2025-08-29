import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para corregir el formato del precio
function formatPrice(priceString) {
    // Remover "S/ " del inicio
    let price = priceString.replace(/^S\/\s*/, '');
    
    // Si tiene formato como "8.50.50", tomar solo la primera parte decimal
    const parts = price.split('.');
    if (parts.length > 2) {
        // Caso: "8.50.50" -> "8.50"
        price = `${parts[0]}.${parts[1]}`;
    } else if (parts.length === 2 && parts[1] === '00') {
        // Caso: "8.00" -> "8.00" (mantener dos decimales)
        price = `${parts[0]}.${parts[1]}`;
    } else if (parts.length === 1) {
        // Caso: "8" -> "8.00"
        price = `${parts[0]}.00`;
    }
    
    // Asegurar que tenga exactamente 2 decimales
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice)) {
        return numPrice.toFixed(2);
    }
    
    return price; // Devolver original si no se puede procesar
}

// Función principal
function fixPricesInFile(inputFile, outputFile) {
    try {
        console.log('Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`Procesando ${products.length} productos...`);
        
        let correctedCount = 0;
        const correctedProducts = products.map((product, index) => {
            const originalPrice = product.precio;
            const correctedPrice = formatPrice(originalPrice);
            
            if (originalPrice !== correctedPrice) {
                correctedCount++;
                if (correctedCount <= 10) { // Mostrar solo los primeros 10 cambios
                    console.log(`Producto ${index + 1}: "${originalPrice}" -> "${correctedPrice}"`);
                }
            }
            
            return {
                ...product,
                precio: correctedPrice
            };
        });
        
        console.log(`\nTotal de precios corregidos: ${correctedCount}`);
        
        // Guardar archivo corregido
        fs.writeFileSync(outputFile, JSON.stringify(correctedProducts, null, 2));
        console.log(`\nArchivo corregido guardado como: ${outputFile}`);
        
        // Mostrar algunos ejemplos de precios corregidos
        console.log('\nEjemplos de correcciones:');
        console.log('=========================');
        correctedProducts.slice(0, 5).forEach((product, index) => {
            console.log(`${index + 1}. ${product.nombre}: ${product.precio}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_fixed.json');

// Ejecutar el script
console.log('🔧 Iniciando corrección de precios...\n');
fixPricesInFile(inputFile, outputFile);
console.log('\n✅ Proceso completado!');
