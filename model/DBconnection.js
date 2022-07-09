import pg from 'pg';

const STOCK_TABLE = `
    CREATE TABLE IF NOT EXISTS stock (
        name TEXT UNIQUE,
        price FLOAT,
        yield FLOAT(15),
        dividendDate TEXT
        );`;

        const USER = `CREATE TABLE IF NOT EXISTS users(
            user_id SERIAL PRIMARY KEY,
            email text unique,
            password text NOT NULL)`;

const USER_STOCK = `CREATE TABLE IF NOT EXISTS user_stocks(
                    id SERIAL,
                    user_id INT NOT NULL,
                    name TEXT,
                    quantity FLOAT,
                    total FLOAT,
                    PRIMARY KEY(id),
                    FOREIGN KEY(user_id)
                    REFERENCES users(user_id) 
                    )`;

const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{
    rejectUnauthorized: false
    }
});

// const db = new pg.Pool ({
//     user: process.env.USERNAME,
//     host: process.env.HOST,
//     database: process.env.DATABASE,
//     password: process.env.PASSWORD,
//     port: process.env.PORT,
//     dialect: "postgres",
//     ssl: { rejectUnauthorized: false }
    
// });

db.connect((err,res)=>{
    if(res) console.log('Successful connection to db');
    if (err) console.log('Unable to connect to db',err);
});
db.query(STOCK_TABLE,(err)=>{
    if(!err)return console.log('successful stock Table insert');
    return console.log('error with query',err.message);
});

db.query(USER,(err)=>{
    if(!err)return console.log('successful USER Table insert');
    return console.log('error with USER query',err.message);
});

db.query(USER_STOCK ,(err)=>{
    if(!err)return console.log('successful USER_STOCK Table insert');
    return console.log('error with USER query',err.message);
});
// ------******************Additional Table Alters******************--------
// db.query(`ALTER TABLE stock ADD COLUMN monthly_payer boolean`)
// db.query(`ALTER TABLE user_stocks ADD COLUMN total_dividends_earned float`)
// db.query(`ALTER TABLE user_stocks ALTER COLUMN total_dividends_earned SET DEFAULT 0.00`)
// db.query(`ALTER TABLE user_stocks ADD COLUMN user_dividend_date TEXT`)
// db.query(`ALTER TABLE stock ADD COLUMN dividend_amount float`)
//-----------********************************************************---------

//db.query(`SELECT * FROM user_stocks`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM stock`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM users`,(err,res)=>{console.log(res.rows)})
// db.query(`UPDATE user_stocks SET user_dividend_date = ''`,(err)=>{if(err)console.log(err)})
// db.query(`UPDATE user_stocks SET total_dividends_earned = 0 WHERE name = 'JPM'`,(err)=>{if(err)console.log(err)})
// db.query(`UPDATE stock SET dividenddate = '' WHERE name = 'AGNC'`,(err)=>{if(err)console.log(err)})
// db.query(`DELETE FROM stock WHERE name = 'AMX'`)
export{db}
