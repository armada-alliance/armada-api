const mysql = require("mysql");
const typeCast = require('./typeCast')

module.exports = ({ host, user, password, database, port }) => {
  console.log(`connect to db at: ${host}`);
  const connection = mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true,
    timezone: "Z",
    charset: "utf8mb4",
    typeCast
  });

  const query = (query, bindings) =>
    new Promise((resolve, reject) => {
      console.log(mysql.format(query, bindings));
      connection.query(query, bindings, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  const connect = () => connection.connect();
  const end = () => connection.end();
  const destroy = () => connection.destroy();
  const transaction = () => query("TRANSACTION;");
  const commit = () => query("COMMIT;");
  const rollback = () => query("ROLLBACK;");

  return {
    connect,
    end,
    destroy,
    transaction,
    commit,
    rollback,
    query
  };
};
