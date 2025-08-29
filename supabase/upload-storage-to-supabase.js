// Sube recursivamente una carpeta local de archivos (ej. backup de storage) a un bucket de Supabase.
// Uso:
//   export SUPABASE_URL="https://<PROJECT>.supabase.co"
//   export SUPABASE_SERVICE_ROLE="key..."
//   export BUCKET="public"   # o el nombre de tu bucket en Supabase
//   node upload_storage_to_supabase.js /ruta/al/folder
//
// Requiere: npm i @supabase/supabase-js

import 'dotenv/config';
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = process.env.BUCKET || "public";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Define SUPABASE_URL y SUPABASE_SERVICE_ROLE en el archivo .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function walkAndUpload(dir, prefix = "") {
  const entries = fs.readdirSync(dir);
  
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);
    
    if (stat.isDirectory()) {
      // Recursivo para subdirectorios
      await walkAndUpload(full, path.join(prefix, e));
    } else {
      // Subir archivo
      const remotePath = path.join(prefix, e).replace(/\\/g, '/');
      const fileBuffer = fs.readFileSync(full);
      
      console.log(`Subiendo: ${remotePath}`);
      
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(remotePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error(`Error subiendo ${remotePath}:`, error);
      } else {
        console.log(`✅ Subido: ${remotePath}`);
      }
    }
  }
}

(async () => {
  const folder = process.argv[2] || "./storage_backup";
  
  if (!fs.existsSync(folder)) {
    console.error("Carpeta no encontrada:", folder);
    process.exit(1);
  }
  
  console.log(`Subiendo contenido de ${folder} al bucket ${BUCKET}...`);
  await walkAndUpload(folder);
  console.log("Upload completado!");
})();
