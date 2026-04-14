import mysql from 'mysql2/promise';

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'surat_salon'
  });
  const [rows] = await connection.execute('SHOW COLUMNS FROM stylists;');
  console.log(rows);
  await connection.end();
}
test().catch(console.error);
