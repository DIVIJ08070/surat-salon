const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Divij@0807',
    database: 'surat_salon'
  });
  
  const [rows] = await conn.query("SHOW COLUMNS FROM stylists LIKE 'specialisation'");
  console.log(rows);
  await conn.end();
}
check().catch(console.error);
