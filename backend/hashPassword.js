// File: hashPassword.js
const bcrypt = require('bcryptjs');

// Password yang ingin Anda gunakan
const password = 'admin123'; 

// "Salt round" - 10 adalah standar yang baik
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error(err);
    return;
  }
  
  console.log("Password Anda: ", password);
  console.log("Hash Anda (Simpan ini di database):");
  console.log(hash);
  
  console.log("\nSQL untuk memasukkan admin:");
  console.log(
    `INSERT INTO admins (username, email, password_hash) VALUES ('admin', 'admin@proyek.com', '${hash}');`
  );
});