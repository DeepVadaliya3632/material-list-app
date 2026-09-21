require('dotenv/config');
const { pool, migrate } = require('./db');

const rows = [
  { name: 'Portland Cement', company: 'UltraTech', supplier: 'Sharma Traders', price: 380.00, quantity: 250, unit: 'bags' },
  { name: 'TMT Steel Bars',  company: 'Tata Steel', supplier: 'Gupta Iron Works', price: 65.50, quantity: null, unit: 'kg' },
  { name: 'Red Clay Bricks', company: 'Wienerberger', supplier: 'Sharma Traders', price: 8.75, quantity: 5000, unit: 'pcs' },
  { name: 'River Sand',      company: 'LocalQuarry', supplier: 'Patel Aggregates', price: 1200.00, quantity: null, unit: 'tonnes' },
  { name: 'PVC Pipe 4-inch', company: 'Astral Pipes', supplier: 'Singh Hardware', price: 245.00, quantity: 80, unit: 'm' },
];

async function seed() {
  await migrate();

  for (const r of rows) {
    await pool.query(
      `INSERT INTO materials (name, company, supplier, price, quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.name, r.company, r.supplier, r.price, r.quantity, r.unit]
    );
  }

  console.log(`Seeded ${rows.length} materials.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
