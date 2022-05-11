import express from 'express';
import sqlite3 from 'sqlite3';
import bodyparser from 'body-parser';
import yahooFinance from 'yahoo-finance';

const app = express();
const port = 3000;

process.on('uncaughtException', (error)  => {
    console.log('🔥🚀Alert! ERROR : ',  error);
    process.exit(1); // Exit your app 
})

app.set('view engine','ejs');
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended:false}))
app.use(bodyparser.json());



const db = new sqlite3.Database('./tracker.db',()=>{
    console.log('connected to db');
});

//Database 
const sql = `
    CREATE TABLE IF NOT EXISTS stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        price TEXT,
        quantity REAL,
        yield REAL,
        total REAL);`;

let error = '';
app.get("/",async(req,res)=>{
    db.run(sql);
    db.all('SELECT * FROM stock ;',(err,data)=>{
        if(err)  return;
        res.render('index',{db:data,error:error});
        error = '';
    })
    
})
app.post("/", async (req,res)=>{
    let database = db
    let insert;
    let result; 
    try{
        result  = await yahooFinance.quote(`${req.body.stock_name}`,['summaryDetail','price',"calendarEvents"])
    }catch(err){
        console.log('🔥error retriving yahoo data:',err.message);
    }
    if(result){
    let yields = result.summaryDetail.dividendRate || result.summaryDetail.trailingAnnualDividendRate ||result.summaryDetail.yield *result.summaryDetail.open || 0;
    let price = result.price.regularMarketPrice || result.summaryDetail.open;
    let dividendDate = (result.calendarEvents && result.calendarEvents.dividendDate )?result.calendarEvents.dividendDate:'';
    yields = parseFloat((yields).toFixed(3));
    let expected_total = parseFloat((yields * req.body.stock_quantity).toFixed(3));
    if(req.body.id !== ''){
        insert = `UPDATE stock SET name = "${(req.body.stock_name.toUpperCase()).toUpperCase()}", price = "$${price}", quantity = "${req.body.stock_quantity}",yield="${yields}",total ="${expected_total}" WHERE id = ${parseInt(req.body.id)}`;
    }else{
        
        insert = `INSERT INTO stock(name,price,quantity,yield,total,dividendDate) VALUES ("${(req.body.stock_name.toUpperCase()).toUpperCase()}", "$${price}", "${req.body.stock_quantity}","${yields}","${expected_total}","${dividendDate}")`;
    }
    db.run(insert, (err) =>{
        if(err) console.log('statement',insert,'Error is:',err);
        else console.log('successful insert to db');
    });
    res.redirect('/');
    }else{
    error = `Stock Ticker:\t ${req.body.stock_name}  not found!`;
    res.redirect('/');
    }
});

app.post('/delete',(req,res)=>{
    db.run(`DELETE FROM stock WHERE id = "${req.body.id}"`,(err)=>{
        if(err) console.log(err.message);
        res.redirect('/');
        console.log('removed id',req.body.id);
    })
})

// updates all stock infomation
const  update_stock_data = ()=>{
    db.all('SELECT * FROM stock ;', (err,data)=>{
        if(err)  return;
        data.forEach((async item=>{
            // let result  = await yahooFinance.quote(item.name,['summaryDetail'],(err)=> {if(err) console.log("yahooFinance update error:",err)})
            let result  = await yahooFinance.quote(item.name,['summaryDetail','price',"calendarEvents"],(err)=> {if(err) console.log("yahooFinance update error:",err)})
            let yields = result.summaryDetail.dividendRate || result.summaryDetail.trailingAnnualDividendRate ||result.summaryDetail.yield *result.summaryDetail.open || 0;
            let price = result.price.regularMarketPrice || result.summaryDetail.open;
            let dividendDate = (result.calendarEvents && result.calendarEvents.dividendDate )?result.calendarEvents.dividendDate:'';
            yields = parseFloat((yields).toFixed(3));
            let expected_total = parseFloat((yields * item.quantity).toFixed(3));
            let insert = `UPDATE stock SET price = "$${price}", yield="${yields}",total ="${expected_total}",dividendDate="${dividendDate}" WHERE id = ${parseInt(item.id)}`;
            db.run(insert, (err) =>{
                if(err) console.log('statement',insert,'Error is:',err);
                else console.log('successful update to db:',item.name);
            });
        }
            ));
    })
    return;
}
function alterTable(){
    let sql = `ALTER TABLE stock ADD COLUMN dividendDate TEXT`;
    db.run(sql,(err)=>{
        if(err) console.log('problem altering table');
    });

}
//alterTable();
setInterval(update_stock_data,1000*60*60);
app.listen(port,()=> `Running on port ${port}`);