import {db} from '../model/DBconnection.js';
import yahooFinance from 'yahoo-finance';

const checkStockInDb = async (stock_name,res)=>{
    const isFound = await db.query(`SELECT * FROM stock WHERE name = $1`,[stock_name.toUpperCase()]);
    console.log('rows :',isFound.rows);
    if(isFound && isFound.rows.length){
        console.log('Stock found in db');
        return;
    }else{
        console.log('insert stock in db');
        insertStockInDb(stock_name,res);
    }
    //return isFound;
}
const insertStockInDb = async (stock_name,res)=>{
    let stock_data='';
    try{
        stock_data  = await yahooFinance.quote(`${stock_name}`,['summaryDetail','price',"calendarEvents"])
    }catch(err){
        console.log('🔥error retriving yahoo data:',err.message);
    }
    if(stock_data){
        try{
            stock_data.summaryDetail.shortName;
        }catch(err){
            console.log(err.message);
            // error ='Unexpected Error!';
            return res.redirect('/');
        }

        let yields = stock_data.summaryDetail.dividendRate || 
                        stock_data.summaryDetail.trailingAnnualDividendRate ||
                        stock_data.summaryDetail.yield *stock_data.summaryDetail.open||0;
        let price = stock_data.price.regularMarketPrice || stock_data.summaryDetail.open;
        let dividendDate = (stock_data.calendarEvents && stock_data.calendarEvents.dividendDate )?stock_data.calendarEvents.dividendDate:'';
            yields = parseFloat((yields).toFixed(3));
            // Inserting new Stock to db
            const insert = `INSERT INTO stock(name,price,yield,dividendDate) VALUES 
            ($1,$2,$3,$4)`;
            const data = [stock_name.toUpperCase(),price,yields,dividendDate];

        db.query(insert,data,(err,result)=>{
            if(result){
                console.log('successful insert');
                return; 
            }
            // send error message
            if(err) return res.redirect('/');
        });
    }else{
        //error = `Stock Ticker:\t ${req.body.stock_name}  not found!`;
        //return res.redirect('/');
        //return {status:false};
        console.log('no stock data found');
    }

};

export{checkStockInDb,insertStockInDb}