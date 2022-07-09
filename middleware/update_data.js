import yahooFinance from "yahoo-finance";
import { db } from "../model/DBconnection.js";
import fs from 'fs';

const hourly_Update_Stock_Price = async (db)=>{
    const date = new Date();
    const day  = date.getDay();
    const time = date.getHours();

    if(day > 0 && day < 6  && time > 9 && time < 16){
        const stock_names = await db.query(`SELECT name FROM stock`);
        if(stock_names.rows){
            stock_names.rows.forEach( async stock=>{
                let dataFromYahoo;
                try{
                    dataFromYahoo  = await yahooFinance.quote(stock.name,['price']);
                }catch(err){ console.log('yahoo update error',err.message)};

                if(dataFromYahoo){
                    // update new stock price
                    let price = dataFromYahoo.price.regularMarketPrice || dataFromYahoo.summaryDetail.open;
                    db.query(`UPDATE stock SET price = $1 WHERE name=$2`,[price,stock.name],(err)=>{if(!err)console.log(`Updated ${stock.name} price:${price}`)});
                }
                //console.log('data is :',data.name);
            })
            console.log('Updating Stock Prices');
        }
    }
}
const monthly_update_dividend_data = async (db)=>{
    console.log('updated dividend dates');
    const stock_names = await db.query(`SELECT name FROM stock`);
        if(stock_names.rows){
            stock_names.rows.forEach( async stock =>{
                let dataFromYahoo;
                try{
                    dataFromYahoo  = await yahooFinance.quote(stock.name,['summaryDetail',"calendarEvents"]);
                }catch(err){ console.log('yahoo dividend update error',err.message)};

                if(dataFromYahoo){
                    let yields = dataFromYahoo.summaryDetail.dividendRate 
                                || dataFromYahoo.summaryDetail.trailingAnnualDividendRate 
                                ||dataFromYahoo.summaryDetail.yield *dataFromYahoo.summaryDetail.open || 0;
                    let dividendDate = 
                            (dataFromYahoo.calendarEvents && dataFromYahoo.calendarEvents.dividendDate )?
                                dataFromYahoo.calendarEvents.exDividendDate.toString().substring(4,15):'';
                    yields = parseFloat((yields).toFixed(3));
                    let isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
                    //console.log(stock.name,dataFromYahoo)
                    console.log(stock.name,'dividendDate is:',dividendDate);
                    const rate = (isMonthlyPayer)?12:4;
                    const reinvestment_amount = (yields)?yields / rate:0;
                    db.query(`UPDATE stock SET yield=$1,dividenddate=$2,monthly_payer=$4, dividend_amount=$5 WHERE name=$3`,[yields,dividendDate,stock.name,isMonthlyPayer,reinvestment_amount],
                            (err)=>{if(!err)console.log(`updated ${stock.name} dividend data: ${yields}`)});
                }
            });
        }
}
const check_if_monthly_dividend_payer = async (stock)=>{
    const data = fs.readFileSync('./public/lists/monthly_dividend_list.txt', 'utf8');
    if(stock !='' && data.includes(stock.toUpperCase()))return true;
    return false;
}
//updates dividends recieved based on yahoo finance data
const update_total_dividends_earned = async ()=>{
    let today = new Date().toString().replace(/T.+/, '').substring(4,15);
    let update_quantity_list = await db.query(`SELECT * FROM stock u INNER JOIN user_stocks s ON u.name = s.name WHERE dividenddate = $1`,[today]);
    //console.log('update stock dividend list for :',today,update_quantity_list.rows);
    update_quantity_list.rows.forEach(async (stock)=>{
        const isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
        const rate = (isMonthlyPayer)?12:4;
        const reinvestment_amount = stock.yield / rate;
        const reinvestment_quantity  =  (reinvestment_amount/stock.price).toFixed(4);
        db.query(`UPDATE user_stocks SET total_dividends_earned = total_dividends_earned + $1,quantity = quantity + $3  WHERE name = $2 and user_id = $4`,[reinvestment_amount*stock.quantity,stock.name,reinvestment_quantity,stock.user_id ],(err)=>{if(err)console.log(err.message)})
        console.log('user:',stock.user_id, 'updating dividends earned:',stock.name,' amount:$',reinvestment_amount*stock.quantity,'total dividend recieved',stock.update_total_dividends_earned);
    })
}

//updates dividends recieved based on user entered dividend date
const update_user_entered_total_dividends_earned = async ()=>{
    let today = new Date().toISOString().slice(0,10);

    let update_quantity_list = await db.query(`SELECT * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE u.user_dividend_date = $1`,[today]);
    console.log('update user entered dividend list for :',today,update_quantity_list.rows);
    update_quantity_list.rows.forEach(async (stock)=>{

        const isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
        const rate = (isMonthlyPayer)?12:4;
        const reinvestment_amount = stock.yield / rate;
        const reinvestment_quantity  =  (reinvestment_amount/stock.price).toFixed(4);
        console.log('updating dividends earned:',stock.name,' amount:',reinvestment_amount);
        db.query(`UPDATE user_stocks SET total_dividends_earned = total_dividends_earned + $1,quantity = quantity + $3  WHERE name = $2 AND user_id = $4`,[reinvestment_amount*stock.quantity,stock.name,reinvestment_quantity*stock.quantity,stock.user_id])
    })
}


//Updates user entered dividend dates for next dividend date cycle
const update_user_entered_dividend_dates = async ()=>{
    let today = new Date().toISOString().slice(0,10);
    const stock_list = await db.query(`select * from user_stocks where user_dividend_date != '' AND user_dividend_date < $1`,[today]);
        // console.log(stock_list.rows)
    stock_list.rows.forEach(async stock=>{
        if(stock.total > 0 && stock.user_dividend_date.substring(5,7) !== today.substring(5,7)){// stock pays dividends
            let isMonthly = await check_if_monthly_dividend_payer(stock.name);
            let nextDividend = (isMonthly)?1:4;
            let user_date  = new Date(stock.user_dividend_date);
            let nextDate = new Date(user_date.setMonth(user_date.getMonth() + nextDividend));
            nextDate= nextDate.toISOString().slice(0,10);
            db.query(`UPDATE user_stocks SET user_dividend_date = $1 WHERE user_id = $2 AND name = $3`,[nextDate,stock.user_id,stock.name],(err)=>{if(err)console.log(err)})
        }
    })
}
export{hourly_Update_Stock_Price,
        monthly_update_dividend_data,
        update_total_dividends_earned,
        update_user_entered_dividend_dates,
        update_user_entered_total_dividends_earned,
        check_if_monthly_dividend_payer }