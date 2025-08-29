// Importa un archivo productos.json local a la tabla api.productos en Supabase usando conexión Postgres.
// Uso:
//   export SUPABASE_DB_URL="postgres://postgres:PASS@HOST:PORT/postgres?sslmode=require"
//   node import_json_to_supabase.js productos.json
//
// Requiere: npm i pg

import 'dotenv/config';
import fs from "fs";
import pg from "pg";

const { Client } = pg;

const file = process.argv[2] || "productos.json";
if (!fs.existsSync(file)) {
  console.error("Archivo no encontrado:", file);
  process.exit(1);
}

async function main() {
  const conn = process.env.SUPABASE_DB_URL;
  if (!conn) {
    console.error("Define SUPABASE_DB_URL (connection string) en el archivo .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false } // necesario para Supabase
  });

  await client.connect();
  console.log("Conectado a Supabase");

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = data.map(p => ({
    id: p.id ?? null,
    name: p.name ?? p.nombre ?? null,
    brand: p.brand ?? p.marca ?? null,
    upc: p.upc ?? p.codigo ?? null,
    price: p.price ?? p.precio ?? null,
    source_image_url: p.sourceImageUrl ?? p.source_image_url ?? p.imagen ?? null
  }));

  const sql = `
    INSERT INTO api.productos (id, name, brand, upc, price, source_image_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      brand = EXCLUDED.brand,
      upc = EXCLUDED.upc,
      price = EXCLUDED.price,
      source_image_url = EXCLUDED.source_image_url
  `;

  try {
    await client.query("BEGIN");
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      await client.query(sql, [row.id, row.name, row.brand, row.upc, row.price, row.source_image_url]);
      
      if ((i + 1) % 100 === 0) {
        console.log(`Procesados ${i + 1}/${rows.length} productos`);
      }
    }
    
    await client.query("COMMIT");
    console.log(`Upsert completado: ${rows.length} filas.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error durante import:", err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);