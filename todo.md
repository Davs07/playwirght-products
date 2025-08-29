# part 1
// Importa un archivo productos.json local a la tabla api.productos en Supabase usando conexión Postgres.
// Uso:
//   export SUPABASE_DB_URL="postgres://postgres:PASS@HOST:PORT/postgres?sslmode=require"
//   node import_json_to_supabase.js productos.json
//
// Requiere: npm i pg

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
    console.error("Define SUPABASE_DB_URL (connection string).");
    process.exit(1);
  }

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false } // necesario para Supabase
  });

  await client.connect();

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = data.map(p => ({
    id: p.id ?? null,
    name: p.name ?? null,
    brand: p.brand ?? null,
    upc: p.upc ?? null,
    price: p.price ?? null,
    source_image_url: p.sourceImageUrl ?? p.source_image_url ?? null
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
    for (const r of rows) {
      await client.query(sql, [r.id, r.name, r.brand, r.upc, r.price, r.source_image_url]);
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

# part 2
// Sube recursivamente una carpeta local de archivos (ej. backup de storage) a un bucket de Supabase.
// Uso:
//   export SUPABASE_URL="https://<PROJECT>.supabase.co"
//   export SUPABASE_SERVICE_ROLE="key..."
//   export BUCKET="public"   # o el nombre de tu bucket en Supabase
//   node upload_storage_to_supabase.js /ruta/al/folder
//
// Requiere: npm i @supabase/supabase-js

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = process.env.BUCKET || "public";
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Define SUPABASE_URL y SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function walkAndUpload(dir, prefix = "") {
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      await walkAndUpload(full, `${prefix}${e}/`);
    } else {
      const remotePath = `${prefix}${e}`;
      console.log("Uploading:", remotePath);
      const fileBuffer = fs.readFileSync(full);
      const { error } = await supabase.storage.from(BUCKET).upload(remotePath, fileBuffer, { upsert: true });
      if (error) console.error("Error uploading", remotePath, error);
    }
  }
}

(async () => {
  const folder = process.argv[2] || "./storage_backup";
  if (!fs.existsSync(folder)) {
    console.error("Carpeta no encontrada:", folder);
    process.exit(1);
  }
  try {
    await walkAndUpload(folder);
    console.log("Subida de storage finalizada.");
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();

# part 3
// Ejemplo simple (front-end) usando supabase-js y la anon key para leer productos.
// En el frontend usa SUPABASE_ANON_KEY (no la service_role).
//
// Requiere: npm i @supabase/supabase-js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://<PROJECT>.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "<ANON_KEY>";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchProducts() {
  const { data, error } = await supabase
    .from("productos")
    .select("id,name,brand,price,source_image_url")
    .limit(50);

  if (error) {
    console.error("Error fetch:", error);
    return [];
  }
  return data;
}

// Llamar fetchProducts() en tu app y renderizar resultados.