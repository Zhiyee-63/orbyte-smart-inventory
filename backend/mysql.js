const mysql = require("mysql2/promise");

const requiredEnvironmentVariables = [
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
];

let pool;

function getMysqlPool() {
  const missing = requiredEnvironmentVariables.filter(
    (name) => process.env[name] === undefined,
  );

  if (missing.length > 0) {
    const error = new Error("MySQL environment variables are missing");
    error.code = "MYSQL_CONFIGURATION_MISSING";
    error.missing = missing;
    throw error;
  }

  const port =
    process.env.MYSQL_PORT === undefined || process.env.MYSQL_PORT === ""
      ? 3306
      : Number(process.env.MYSQL_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error("MYSQL_PORT must be a valid port number");
    error.code = "MYSQL_CONFIGURATION_INVALID";
    throw error;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false,
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

module.exports = { getMysqlPool };
