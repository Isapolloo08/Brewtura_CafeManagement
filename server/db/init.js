import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('⚡ Initializing Database Schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Database Schema created successfully.');

    // Seed default branch if empty
    const branchRes = await client.query('SELECT id FROM branches LIMIT 1');
    let branchId;
    if (branchRes.rowCount === 0) {
      const newBranch = await client.query(
        "INSERT INTO branches (name, address) VALUES ($1, $2) RETURNING id",
        ['Main Branch', '123 Coffee St. Central City']
      );
      branchId = newBranch.rows[0].id;
      console.log('🌱 Seeded default branch ID:', branchId);
    } else {
      branchId = branchRes.rows[0].id;
    }

    // Seed default admin user if empty
    const userRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (userRes.rowCount === 0) {
      const passHash = await bcrypt.hash('admin123', 10);
      const pinHash = await bcrypt.hash('1234', 10);
      await client.query(
        `INSERT INTO users (branch_id, employee_id, name, email, password_hash, pin_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [branchId, 'ADM-001', 'System Admin', 'admin@coffeeshop.com', passHash, pinHash, 'admin']
      );
      console.log('🌱 Seeded default admin user: ADM-001 / admin123 (PIN: 1234)');
    }

    // Seed demo users matching the frontend login page (ADM-001 / MGR-002 / INV-003)
    const seedUsers = [
      { name: 'Marco V.', employeeId: 'ADM-001', email: 'adm-001@coffeeshop.com', password: 'admin123', role: 'admin' },
      { name: 'Elena R.', employeeId: 'MGR-002', email: 'mgr-002@coffeeshop.com', password: 'manager1', role: 'manager' },
      { name: 'Jonas P.', employeeId: 'INV-003', email: 'inv-003@coffeeshop.com', password: 'staff123', role: 'stock_clerk' },
    ];
    for (const u of seedUsers) {
      const existing = await client.query('SELECT id FROM users WHERE employee_id = $1 OR email = $2', [u.employeeId, u.email]);
      if (existing.rowCount === 0) {
        const passHash = await bcrypt.hash(u.password, 10);
        const pinHash = await bcrypt.hash('1234', 10);
        await client.query(
          `INSERT INTO users (branch_id, employee_id, name, email, password_hash, pin_hash, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [branchId, u.employeeId, u.name, u.email, passHash, pinHash, u.role]
        );
        console.log(`🌱 Seeded demo user: ${u.employeeId} / ${u.password}`);
      }
    }

    // Seed default settings if empty
    const settingsRes = await client.query('SELECT key FROM settings LIMIT 1');
    if (settingsRes.rowCount === 0) {
      await client.query(`
        INSERT INTO settings (key, value) VALUES
        ('tax_rate', '0.12'),
        ('currency', 'PHP'),
        ('receipt_header', 'Brewtura'),
        ('receipt_footer', 'Thank you for dining with us!')
      `);
      console.log('🌱 Seeded default system settings.');
    }

    // Seed default customization templates if empty
    const customizationTemplateRes = await client.query('SELECT id FROM customization_templates LIMIT 1');
    if (customizationTemplateRes.rowCount === 0) {
      await client.query(`
        INSERT INTO customization_templates (name, customization_type, default_price_delta) VALUES
        ('Small (8oz)', 'size', 0),
        ('Small (12oz)', 'size', 0),
        ('Medium (16oz)', 'size', 0.60),
        ('Large (20oz)', 'size', 1.20),
        ('16oz Iced', 'size', 0.50),
        ('Hot', 'option', 0),
        ('Iced', 'option', 0),
        ('Single Shot', 'option', 0),
        ('Double Shot', 'option', 0.75),
        ('Decaf', 'option', 0),
        ('Extra Shot', 'option', 1.00),
        ('Oat Milk', 'option', 0.75),
        ('Almond Milk', 'option', 0.75),
        ('Whipped Cream', 'option', 0.60),
        ('Vanilla Syrup', 'option', 0.50)
      `);
      console.log('🌱 Seeded default customization templates.');
    }

    // Seed default temperature options if empty
    const temperatureRes = await client.query('SELECT id FROM temperature_options LIMIT 1');
    if (temperatureRes.rowCount === 0) {
      await client.query(`
        INSERT INTO temperature_options (name, price_delta) VALUES
        ('Hot', 0),
        ('Iced', 0),
        ('Room Temp', 0),
        ('Extra Hot', 0)
      `);
      console.log('🌱 Seeded default temperature options.');
    }

    // Seed default milk options if empty
    const milkRes = await client.query('SELECT id FROM milk_options LIMIT 1');
    if (milkRes.rowCount === 0) {
      await client.query(`
        INSERT INTO milk_options (name, price_delta) VALUES
        ('Whole Milk', 0),
        ('Oat Milk', 0.75),
        ('Almond Milk', 0.75),
        ('Soy Milk', 0.75),
        ('Skim Milk', 0)
      `);
      console.log('🌱 Seeded default milk options.');
    }

    // Seed default add-ons if empty
    const addonRes = await client.query('SELECT id FROM addons LIMIT 1');
    if (addonRes.rowCount === 0) {
      await client.query(`
        INSERT INTO addons (name, price) VALUES
        ('Extra Espresso Shot', 0.75),
        ('Caramel Drizzle', 0.40),
        ('Chocolate Drizzle', 0.40),
        ('Whipped Cream', 0.60),
        ('Hazelnut Syrup', 0.50),
        ('Vanilla Syrup', 0.50)
      `);
      console.log('🌱 Seeded default add-ons.');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', err);
  } finally {
    client.release();
    process.exit();
  }
}

initDB();
