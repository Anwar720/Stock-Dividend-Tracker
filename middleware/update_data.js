import yahooFinance from "yahoo-finance";
import { db } from "../model/DBconnection.js";
import fs from 'fs';

const hourly_Update_Stock_Price = async ()=>{
    const date = new Date();
    const day  = date.getDay();
    const time = date.getHours();
    console.log('called hourly price',date,time);
    
    let isDuringMarketHours = day > 0 && day < 6  && time >= 9 && time < 16;
    if(isDuringMarketHours){
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
            })
            //log 
            db.query(`UPDATE logs SET  hourly_stock_price_updated = $1`,[date.toLocaleString('en-US', {
                timeZone: 'America/New_York',
            })],(err)=>{
                (err)?console.log(err.message):console.log('success update stock price')});
            console.log('Updating Stock Prices');
        }
    }
}

const monthly_update_dividend_data = async ()=>{
    console.log('updated dividend dates');
    const stock_names = await db.query(`SELECT name FROM stock`);
        if(stock_names.rows){
            stock_names.rows.forEach( async stock =>{
                let dataFromYahoo;
                try{
                    dataFromYahoo  = await yahooFinance.quote(stock.name,['summaryDetail',"calendarEvents"]);
                }catch(err){ console.log('yahoo dividend update error',err.message)};

                let isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
                if(dataFromYahoo && !isMonthlyPayer){
                    let yields = dataFromYahoo.summaryDetail.dividendRate 
                                || dataFromYahoo.summaryDetail.trailingAnnualDividendRate 
                                ||dataFromYahoo.summaryDetail.yield *dataFromYahoo.summaryDetail.open || 0;
                    let dividendDate = 
                            (dataFromYahoo.calendarEvents && dataFromYahoo.calendarEvents.dividendDate )?
                                dataFromYahoo.calendarEvents.dividendDate.toString().substring(4,15):'';
                    yields = parseFloat((yields).toFixed(3));
                    // let isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
                    //console.log(stock.name,dataFromYahoo)
                    console.log(stock.name,'dividendDate is:',dividendDate);
                    const rate = (isMonthlyPayer)?12:4;
                    const reinvestment_amount = (yields)?yields / rate:0;
                    db.query(`UPDATE stock SET yield=$1,dividenddate=$2,monthly_payer=$4, dividend_amount=$5 WHERE name=$3`,[yields,dividendDate,stock.name,isMonthlyPayer,reinvestment_amount],
                            (err)=>{if(!err)console.log(`updated ${stock.name} dividend data: ${yields}`)});
                            
                    //log data
                    const date = new Date();
                    db.query(`UPDATE logs SET  monthly_update_dividend_data_updated = $1`,[date.toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                    })],(err)=>{
                        (err)?console.log(err.message):console.log('success update stock price')});
                }
            });
        }
}
const check_if_monthly_dividend_payer = async (stock)=>{
    let formated_stock = ' ' + stock + ' ';
    const data = fs.readFileSync('./public/lists/monthly_dividend_list.txt', 'utf8');
    if(stock !='' && data.includes(formated_stock.toUpperCase()))return true;
    return false;
}

//updates dividends recieved based on yahoo finance data
const update_total_dividends_earned = async ()=>{
    let today = new Date().toString().slice(4,15)
    let year = new Date().setFullYear()
    console.log(today)
    let update_quantity_list = await db.query(`SELECT * FROM stock u INNER JOIN user_stocks s ON u.name = s.name WHERE dividenddate = $1`,[today]);
    update_quantity_list.rows.forEach(async (stock)=>{
        const isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
        const rate = (isMonthlyPayer)?12:4;
        const reinvestment_amount = stock.yield / rate;
        const reinvestment_quantity  =  (reinvestment_amount/stock.price).toFixed(4);
        db.query(`UPDATE user_stocks SET total_dividends_earned = total_dividends_earned + $1,quantity = quantity + $3,this_years_dividends = this_years_dividends + $1  WHERE name = $2 and user_id = $4`,[reinvestment_amount*stock.quantity,stock.name,reinvestment_quantity,stock.user_id ],(err)=>{if(err)console.log(err.message)})
        console.log('user:',stock.user_id, 'updating dividends earned:',stock.name,' amount:$',reinvestment_amount*stock.quantity,'total dividend recieved',stock.update_total_dividends_earned);
        //update dividends earned in the yearly records table
        db.query(`UPDATE yearly_records SET total_dividends = total_dividends + $1 WHERE user_id = $2 and year = $3`,[reinvestment_amount*stock.quantity,stock.user_id,year])
    })

    //log data
    const date = new Date();
    if(update_quantity_list.rows.length > 0) {
        const stock_names = update_quantity_list.rows.map(stock=>stock.name);
        db.query(`UPDATE logs SET  yahoo_dividends_earned_updated = $1`,[[date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
        }),...stock_names]],(err)=>{
            (err)?console.log(err.message):console.log('success update stock price')});
        }
}
//updates dividends recieved based on user entered dividend date
const update_user_entered_total_dividends_earned = async ()=>{
    let today = new Date().toISOString().slice(0,10);
    let year = new Date().getFullYear()
    let update_quantity_list = await db.query(`SELECT * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE u.user_dividend_date = $1`,[today]);
    update_quantity_list.rows.forEach(async (stock)=>{

        const isMonthlyPayer = await check_if_monthly_dividend_payer(stock.name);
        const rate = (isMonthlyPayer)?12:4;
        const reinvestment_amount = stock.yield / rate;
        const reinvestment_quantity  =  (reinvestment_amount/stock.price).toFixed(4);
        // console.log('updating dividends earned:',stock.name,' amount per share:',reinvestment_amount, 'total reinvested:',reinvestment_amount*stock.quantity
        // ,'reinvestment quantity is: ',reinvestment_quantity*stock.quantity);
        db.query(`UPDATE user_stocks SET total_dividends_earned = total_dividends_earned + $1,quantity = quantity + $3,this_years_dividends = this_years_dividends + $1  WHERE name = $2 AND user_id = $4`,[reinvestment_amount*stock.quantity,stock.name,reinvestment_quantity*stock.quantity,stock.user_id])
        
        //update dividends earned in the yearly records table
        db.query(`UPDATE yearly_records SET total_dividends = total_dividends + $1 WHERE user_id = $2 and year = $3`,[reinvestment_amount*stock.quantity,stock.user_id,year])
    })

    const date = new Date();
    if(update_quantity_list.rows.length > 0) {
        const stock_names = update_quantity_list.rows.map(stock=>`${stock.user_id}:${stock.name}`);
        db.query(`UPDATE logs SET  user_entered_dividends_earned_updated = $1`,[[date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
        }),...stock_names]]);
        }
}


//Updates user entered dividend dates for next dividend date cycle
const update_user_entered_dividend_dates = async ()=>{
    let today = new Date().toISOString().slice(0,10);
    const stock_list = await db.query(`select * from user_stocks where user_dividend_date != '' AND user_dividend_date <= $1`,[today]);
        // console.log(today,stock_list.rows)
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

    const date = new Date();
    if(stock_list.rows.length > 0) {
        const stock_names = stock_list.rows.map(stock=>`${stock.user_id}:${stock.name}`);
        db.query(`UPDATE logs SET  user_entered_dividend_date_updated = $1`,[[date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
        }),...stock_names]]);
        }
}

const resetYearlyDividends = async()=>{
    await db.query(`UPDATE user_stocks SET this_years_dividends = 0.00`,(err)=>{if(err)console.log('error with reseting yearly dividends:',err)})
}

// update yearly dividend data for each account
const setYearlyRecords = async ()=>{
    const users =  await db.query(`SELECT * FROM users`)
    users.rows.forEach(async user => {
        let total = await db.query(`SELECT SUM(this_years_dividends) FROM user_stocks WHERE user_id = ${user.user_id}`);
        let year  = new Date().getFullYear();
        let total_dividends = total.rows[0].sum || 0.00
        console.log(user.user_id,year,total.rows[0].sum)
         // upload data to yearly record table
        await db.query(`INSERT INTO yearly_records (user_id,year,total_dividends) VALUES ($1,$2,$3)`,[user.user_id,year,total_dividends])
    })
    resetYearlyDividends()
}

const setMonthlyDividendRecords = async ()=>{
    const date = new Date()
    const month_string = date.toString().substring(4,7);
    const month = (date.getMonth() + 1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
    const year = date.getFullYear()
    const monthYear = month_string + year;
    
    const users = await db.query(`SELECT * FROM users `)
    users.rows.forEach(async user =>{
        //get stock list for each user
        const stock_list =  await db.query('SELECT  * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE u.user_id = $1',[user.user_id]);
        // find stocks paying this month
        const stock_list_paying_current_month = stock_list.rows.filter(stock => stock.dividenddate.includes(month_string) && stock.dividenddate.includes(year.toString()) 
                                                                            || stock.dividenddate == '' && stock.user_dividend_date.substring(0,4) == year.toString() && stock.user_dividend_date.substring(5,7) == month.toString())
        let month_total = 0;
        const month_report = {}
        //fill month report object
        stock_list_paying_current_month.forEach(stock=>{
            month_total += stock.dividend_amount * stock.quantity
            month_report[`${monthYear}-${stock.name}`] = { 
                name:stock.name, 
                dividend_per_share:stock.dividend_amount,
                expected_dividends:stock.dividend_amount * stock.quantity, 
                dividenddate:stock.dividenddate || new Date(stock.user_dividend_date).toString().substring(4,15)}
        })
        console.log(month_report)
        // push report into monthly record table
        await db.query(`INSERT INTO monthly_records (user_id,month,year,stock_list,total_dividends) VALUES ($1,$2,$3,$4,$5)`,[user.user_id,month_string,year,month_report,month_total])
    })
}

// setMonthlyDividendRecords()

export{hourly_Update_Stock_Price,
        monthly_update_dividend_data,
        update_total_dividends_earned,
        update_user_entered_dividend_dates,
        update_user_entered_total_dividends_earned,
        check_if_monthly_dividend_payer,
        setYearlyRecords,
        setMonthlyDividendRecords  }