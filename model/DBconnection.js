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
console.log('the updated version');

const db = new Pool({
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

// const connectionString = process.env.DATABASE_URL;
// const db = new pg.Pool ({
//     connectionString,
// });
await db.connect((err,res)=>{
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

// db.query(`INSERT INTO stock (name,price,quantity,yield,total,dividendDate) VALUES ('VOO','140.00',1.0,1.0,10,'june')`,(err)=>{if(err)console.log(err)})
//db.query("SELECT * FROM stock",(err,res)=>{console.log(res.rows)})
//db.query("DROP TABLE user_stocks")
//db.end();

export{db}
