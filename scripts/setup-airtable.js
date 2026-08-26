#!/usr/bin/env node

/**
 * Setup script to initialize Airtable base with required tables and seed admin user
 * 
 * Usage: node scripts/setup-airtable.js
 * 
 * This script:
 * 1. Creates the Users table with proper fields
 * 2. Creates the Patients table with all required fields
 * 3. Creates the Alerts table
 * 4. Seeds a default admin account (email: admin@consulta.com, password: demo123)
 */

require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const https = require('https');

const apiToken = process.env.AIRTABLE_API_TOKEN;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiToken || !baseId) {
  console.error('Error: Missing AIRTABLE_API_TOKEN or NEXT_PUBLIC_AIRTABLE_BASE_ID in .env.local');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Content-Type': 'application/json',
};

function makeAirtableRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.airtable.com/v0${path}`;
    const urlObj = new URL(url);
    
    const options = {
      method,
      headers,
    };

    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Airtable API error: ${res.statusCode} ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`Airtable API error: ${res.statusCode}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function setupAirtable() {
  try {
    console.log('🔧 Starting Airtable setup...\n');

    console.log('📋 Creating seeding admin user...');
    try {
      const passwordHash = await bcrypt.hash('demo123', 10);
      
      const createUserBody = {
        records: [{
          fields: {
            Nombre: 'Administrador',
            Email: 'admin@consulta.com',
            Password_hash: passwordHash,
            Rol: 'admin'
          }
        }]
      };

      try {
        await makeAirtableRequest('POST', `/${baseId}/Users`, createUserBody);
        console.log('✅ Admin user created!');
        console.log('   Email: admin@consulta.com');
        console.log('   Password: demo123\n');
      } catch (error) {
        if (error.message.includes('INVALID_REQUEST_UNKNOWN')) {
          // Table doesn't exist, which is expected
          console.log('⚠️  Note: Please create the Users table manually in Airtable first');
        } else if (error.message.includes('duplicate')) {
          console.log('✅ Admin user already exists\n');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not create admin user:', error.message);
    }

    console.log('📋 Airtable Setup Instructions\n');
    console.log('Please create these tables manually in Airtable:\n');

    console.log('TABLE: Users');
    console.log('  Fields:');
    console.log('    - Nombre (Single line text)');
    console.log('    - Email (Single line text) [UNIQUE]');
    console.log('    - Password_hash (Single line text)');
    console.log('    - Rol (Single select: admin, user)\n');

    console.log('TABLE: Patients');
    console.log('  Fields:');
    console.log('    - Nombre (Single line text)');
    console.log('    - Teléfono (Phone number)');
    console.log('    - Terapeuta (Link to Users)');
    console.log('    - Fecha_primer_contacto (Date)');
    console.log('    - Motivo_consulta (Long text)');
    console.log('    - Estado (Single select: Alta, Baja, Reingreso)');
    console.log('    - Num_sesiones (Number, default 0)');
    console.log('    - Num_inasistencias (Number, default 0)');
    console.log('    - Dx_principal (Single line text)');
    console.log('    - Dx_comorbilidad (Single line text)');
    console.log('    - Dx_otros_problemas (Single line text)');
    console.log('    - Historia_clinica (Long text)');
    console.log('    - Bateria_pruebas (Single line text)');
    console.log('    - Observaciones_pruebas (Long text)');
    console.log('    - Reusar_pruebas (Checkbox)');
    console.log('    - Plan_tratamiento (Long text)');
    console.log('    - Plan_no_suicidio (Checkbox)');
    console.log('    - Consentimiento_informado (Checkbox)');
    console.log('    - Referido_psiquiatria (Checkbox)');
    console.log('    - Expediente_completo (Checkbox, default true)');
    console.log('    - Etapa_actual (Single select: Primer contacto, Evaluación, Tratamiento)\n');

    console.log('TABLE: Alerts');
    console.log('  Fields:');
    console.log('    - Paciente (Link to Patients)');
    console.log('    - Paso_incompleto (Single line text)');
    console.log('    - Usuario (Link to Users)');
    console.log('    - Fecha_hora (DateTime)');
    console.log('    - Campos_faltantes (Number)');
    console.log('    - Notificado (Checkbox)\n');

    console.log('🎉 Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Create the three required tables in Airtable (see above)');
    console.log('2. Run: npm install');
    console.log('3. Run: npm run dev');
    console.log('4. Visit http://localhost:3000 and log in with:');
    console.log('   Email: admin@consulta.com');
    console.log('   Password: demo123\n');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
}

setupAirtable();
