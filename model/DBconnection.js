import pg from 'pg';

const STOCK_TABLE = `
    CREATE TABLE IF NOT EXISTS stock (
        name TEXT UNIQUE,
        price FLOAT,
        yield FLOAT(15),
        dividendDate TEXT,
        dividend_amount FLOAT,
        monthly_payer BOOLEAN,
        is_date_in_yahoo BOOLEAN DEFAULT false,
        date_list TEXT ARRAY DEFAULT ARRAY[]::varchar[]
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
                    this_years_dividends FLOAT DEFAULT 0.00,
                    dividend_dates JSON ARRAY,
                    total_dividends_earned float DEFAULT 0.00,
                    user_dividend_date TEXT,
                    PRIMARY KEY(id),
                    FOREIGN KEY(user_id)
                    REFERENCES users(user_id) 
                    )`;
const all_logs = `CREATE TABLE IF NOT EXISTS all_logs(
                time TEXT NOT NULL,
                event TEXT
)`
const logs =`CREATE TABLE IF NOT EXISTS logs(
            hourly_stock_price_updated TEXT,
            yahoo_dividend_date_updated TEXT[],
            user_entered_dividend_date_updated TEXT[],
            yahoo_dividends_earned_updated TEXT[],
            user_entered_dividends_earned_updated TEXT[],
            monthly_update_dividend_data_updated TEXT
            )`;
const Yearly_records = `CREATE TABLE IF NOT EXISTS yearly_records(
            user_id INT NOT NULL,
            year int NOT NULL,
            total_dividends FLOAT  DEFAULT 0.00
)`;
const monthly_records = `CREATE TABLE IF NOT EXISTS monthly_records(
                        user_id INT NOT NULL ,
                        month TEXT NOT NULL,
                        year int NOT NULL,
                        stock_list JSON,
                        dividendDate TEXT,
                        total_dividends FLOAT DEFAULT 0.00
)`;
const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{
    rejectUnauthorized: false
    }
});

// db.connect((err,res)=>{
//     if(res) console.log('Successful connection to db');
//     if (err) console.log('Unable to connect to db',err);
// });

// db.on('error', (err, client) => {
//     console.error('Unexpected error on idle client', err)
//     process.exit(-1)
// })



// db.query(STOCK_TABLE,(err)=>{
//     if(!err)return console.log('successful stock Table insert');
//     return console.log('error with query',err.message);
// });

// db.query(USER,(err)=>{
//     if(!err)return console.log('successful USER Table insert');
//     return console.log('error with USER query',err.message);
// });

// db.query(USER_STOCK ,(err)=>{
//     if(!err)return console.log('successful USER_STOCK Table insert');
//     return console.log('error with USER query',err.message);
// });
// db.query(Yearly_records ,(err)=>{
//     if(!err)return console.log('successful Yearly_records Table insert');
//     return console.log('error with Yearly_records query',err.message);
// });

// db.query(monthly_records ,(err)=>{
//     if(!err)return console.log('successful monthly_records Table insert');
//     return console.log('error with monthly_records query',err.message);
// });

// db.query(logs ,(err)=>{
//     if(!err)return console.log('successful logs Table insert');
//     return console.log('error with logs query',err.message);
// });

// db.query(all_logs ,(err)=>{
//     if(!err)return console.log('successful logs Table insert');
//     return console.log('error with logs query',err.message);
// });


// ------******************Additional Table Alters******************--------
// db.query(`ALTER TABLE stock ADD COLUMN monthly_payer boolean`)
// db.query(`ALTER TABLE stock ADD COLUMN is_date_in_yahoo boolean DEFAULT false`)
// db.query(`ALTER TABLE stock ADD COLUMN date_list TEXT ARRAY DEFAULT ARRAY[]::varchar[] `)
// db.query(`ALTER TABLE user_stocks ADD COLUMN this_years_dividends FLOAT DEFAULT 0.00`)
// db.query(`ALTER TABLE user_stocks ADD COLUMN dividend_dates JSON ARRAY`)
// db.query(`ALTER TABLE user_stocks ALTER COLUMN total_dividends_earned SET DEFAULT 0.00`)
// db.query(`ALTER TABLE user_stocks ALTER COLUMN total_dividends_earned SET DEFAULT 0.00`)
// db.query(`ALTER TABLE user_stocks ADD COLUMN user_dividend_date TEXT`)
// db.query(`ALTER TABLE yearly_records DROP CONSTRAINT uid`)
// -----------********************************************************---------

// db.query(`SELECT * FROM user_stocks WHERE user_id = 1`,(err,res)=>{console.log(res.rows);db.release()})
// db.query(`SELECT * FROM stock WHERE name='ASDFASDFASDF'`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM logs`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM users`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM user_stocks WHERE user_id = 6`,(err,res)=>{console.log(res.rows)})
// db.query(`SELECT * FROM monthly_records`,(err,res)=>{console.log(res.rows)})
// db.query(`UPDATE user_stocks SET user_dividend_date = ''`,(err)=>{if(err)console.log(err)})
// db.query(`UPDATE user_stocks SET quantity = 16.569 WHERE name = 'VOO' AND user_id = 6`,(err)=>{if(err)console.log(err)})
// db.query(`UPDATE stock SET  dividenddate = 'Jan 11 2023' WHERE name = 'AGNC'`,(err)=>{if(err)console.log(err)})
// db.query(`DELETE FROM users WHERE email = 'user7@gmail.com'`)
// db.query(`DELETE FROM stock WHERE name = 'SPY'`)
// db.query(`DROP TABLE monthly_records`)
export{
    db
}
