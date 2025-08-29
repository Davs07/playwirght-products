// Importa un archivo productos.json local a Supabase usando la REST API.
// Uso: node import-json-via-rest.js productos.json
// Requiere: npm i @supabase/supabase-js

import 'dotenv/config';
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2] || "finals/products.json";
if (!fs.existsSync(file)) {
  console.error("Archivo no encontrado:", file);
  process.exit(1);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Define SUPABASE_URL y SUPABASE_SERVICE_ROLE en el archivo .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    db: { schema: 'api' }
  });

  console.log("Conectado a Supabase via REST API");

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Cargados ${data.length} productos desde ${file}`);

  // Preparar datos - TODOS los productos
  const rows = data.map(p => ({
    id: p.id ?? null,
    name: p.name ?? p.nombre ?? null,
    brand: p.brand ?? p.marca ?? null,
    upc: p.upc ?? p.codigo ?? null,
    price: p.price ?? p.precio ?? null,
    source_image_url: p.sourceImageUrl ?? p.source_image_url ?? p.imagen ?? null
  }));

  console.log(`Procesando ${rows.length} productos...`);

  // Insertar en lotes de 50 (más eficiente para muchos datos)
  const batchSize = 50;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i/batchSize) + 1;
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    try {
      const { data: result, error } = await supabase
        .from('productos')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Error en lote ${batchNumber}/${totalBatches}:`, error.message);
        errors++;
        continue;
      }

      processed += batch.length;
      
      // Mostrar progreso cada 10 lotes o al final
      if (batchNumber % 10 === 0 || i + batchSize >= rows.length) {
        const percentage = Math.round((processed / rows.length) * 100);
        console.log(`📦 Lote ${batchNumber}/${totalBatches} - Procesados ${processed}/${rows.length} productos (${percentage}%)`);
      }
      
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`💥 Error crítico en lote ${batchNumber}:`, err.message);
      errors++;
    }
  }

  console.log(`\n🎉 Importación completada:`);
  console.log(`   ✅ Productos procesados: ${processed}`);
  console.log(`   ❌ Lotes con errores: ${errors}`);
  console.log(`   📊 Total productos en archivo: ${rows.length}`);
}

main().catch(console.error);
