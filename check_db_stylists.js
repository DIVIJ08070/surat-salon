const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Divij@0807',
    database: 'surat_salon'
  });
  
  console.log("Columns in stylists:");
  const [columns] = await conn.query("SHOW COLUMNS FROM stylists");
  console.log(columns);

  console.log("\nLast 5 stylists:");
  const [rows] = await conn.query("SELECT * FROM stylists ORDER BY id DESC LIMIT 5");
  console.log(rows);

  await conn.end();
}
check().catch(console.error);
