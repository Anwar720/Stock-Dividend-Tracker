import 'dotenv/config'
import express from 'express';
import bodyparser from 'body-parser';
import yahooFinance from 'yahoo-finance';
import cookieParser from 'cookie-parser';
import {db} from './model/DBconnection.js';
import schedule from 'node-schedule';
import {hourly_Update_Stock_Price,
        update_yahoo_dividend_dates ,
        update_total_dividends_earned,
        update_user_entered_dividend_dates,
        update_user_entered_total_dividends_earned,
        check_if_monthly_dividend_payer,
        setYearlyRecords,
        setMonthlyDividendRecords,
        updateDividendDatesNotInYahoo,
        updateSingleDateAndDateListNotInYahoo   } from './middleware/update_data.js';
import { register_user,
        login_user } from './middleware/authentication.middleware.js';
import {verifyJwt,
        checkAuthenitcated,
        checkNotAuthenticated} from './middleware/verification.middleware.js';
import {Validation,
        validationResult,validate_stock_input} from './middleware/validation.middleware.js';
import {checkStockInDb} from './middleware/checkDB.middleware.js'
import {check} from 'express-validator';
import { scheduleJob } from 'node-schedule';
import {getStockInfoFromWeb} from './middleware/scraping.js'

const app = express();
const port = process.env.PORT || 3000;

process.on('uncaughtException', (error)  => {
    console.log('🔥🚀Alert! ERROR : ',  error);
    process.exit(1);
})

app.set('view engine','ejs');
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended:false}))
app.use(bodyparser.json());
app.use(cookieParser());

let loginError='';
app.get("/login",checkNotAuthenticated,(req,res)=>{
    res.render("login",{error:loginError});
    loginError='';
})

let registerError='';
app.get("/register",checkNotAuthenticated ,(req,res)=>{
    res.render("register",{error:registerError});
    registerError=''
})


let error="";
// render home page
app.get("/",checkAuthenitcated,async(req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']);
    const year = new Date().getFullYear();
    //get stock data
    const data = await db.query('SELECT  * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE user_id = $1',[user_id]);
    //get dividend records for dividends earned this year
    const yearly_records = await db.query(`SELECT * FROM yearly_records WHERE user_id = $1 and year = $2`,[user_id,year])

    res.render('index',{db:data.rows,yearly_records:yearly_records.rows[0],error});
    error="";
})

app.get('/admin',checkAuthenitcated,async (req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']);
    if(user_id === 8 || user_id == 6){
        const stocks = await db.query(`SELECT  * FROM stock`);
        const user_stocks = await db.query(`SELECT  * FROM user_stocks`);
        const logs = await db.query(`SELECT  * FROM logs`);
        // console.log(user_stocks.rows);
        return res.render('admin_dash',{data:stocks.rows,user_stocks:user_stocks.rows,logs:logs.rows});
    }
    return res.redirect('/');
})


// Adding and updating Stocks
app.post("/",async (req,res)=>{
    // validate user input
    if(!validate_stock_input(req)){
        error = "Invalid Ticker Info";
        return res.redirect("/");
    }
    const {user_id} = verifyJwt(req.cookies['token']) ;
    let {stock_name,stock_quantity} = req.body;
    const isStockFound = await db.query(`SELECT * FROM stock WHERE name = $1`,[`${stock_name.toUpperCase()}`]);
    if(isStockFound.rows.length == 0){// stock data is not in db, insert to db
        let stock_data='';
        try{
            stock_data  = await yahooFinance.quote(`${stock_name}`,['summaryDetail','price',"calendarEvents"])
        }catch(err){
            console.log('🔥error retriving yahoo data:',err.message);
            error = "Invalid Ticker name";
            return res.redirect("/");
        }
        // stock data retrieved from yahoo finance
        if(stock_data){
                try{ // in case stock exists but may be delisted
                    stock_data.summaryDetail.shortName;
                }catch(err){
                    console.log(err.message);
                    error ='Ticker Not Found!';
                    return res.redirect('/');
                }
            let yields = stock_data.summaryDetail.dividendRate || 
                            stock_data.summaryDetail.trailingAnnualDividendRate ||
                            stock_data.summaryDetail.yield *stock_data.summaryDetail.open||0;
            let price = stock_data.price.regularMarketPrice || stock_data.summaryDetail.open;
            let dividendDate = (stock_data.calendarEvents && stock_data.calendarEvents.dividendDate)
                                                            ? stock_data.calendarEvents.dividendDate.toString().substring(4,15):'';
                yields = parseFloat((yields).toFixed(3));
            let monthly_payer = await check_if_monthly_dividend_payer(stock_name);
            let dividend_amount = (monthly_payer)?yields/12:yields/4;
            let is_date_in_yahoo = dividendDate.length > 0
            // Inserting new Stock data to stock db
            const insert = `INSERT INTO stock(name,price,yield,dividendDate,monthly_payer,dividend_amount,is_date_in_yahoo) VALUES ($1,$2,$3,$4,$5,$6,$7)`;
            const data = [stock_name.toUpperCase(),price,yields,dividendDate,monthly_payer,dividend_amount,is_date_in_yahoo];
            db.query(insert,data ,async (err,result)=>{
                if(result){
                    console.log('successful insert: ');
                    // update dividend date if not available already
                    if(dividendDate == '')
                        await updateSingleDateAndDateListNotInYahoo(stock_name.toUpperCase())
                }
                // send error message
                if(err){
                    error = "Error with Database";
                    return res.redirect('/');
                }
            });
            
        };


    };
    // Insert data in user_stock table
    const yields = await db.query(`SELECT yield,dividenddate FROM stock WHERE name = $1`,[stock_name.toUpperCase()]);
    if(yields.rows){
        stock_quantity = parseFloat(stock_quantity);
        stock_name = stock_name.toUpperCase();
        let estimated_Annual_dividends = parseFloat(yields.rows[0].yield*stock_quantity).toFixed(4);
            let user_dividend_date = (req.body.user_dividend_date)? new Date(req.body.user_dividend_date.replace(/-/g, '\/').replace(/T.+/, '') ) : '';
                user_dividend_date = (user_dividend_date && req.body.user_dividend_date)?user_dividend_date.toISOString().slice(0,10):'';
            // console.log('user date is:',req.body.user_dividend_date,'parsed is: ',user_dividend_date)
        // check if the stock exists in the users_stock table
                const isStockInUserStockTable = await db.query(`SELECT * FROM user_stocks WHERE name = $1 AND user_id = $2`,[stock_name,user_id]);
                console.log('isStockInUserStockTable',isStockInUserStockTable.rows.length);
                if(isStockInUserStockTable.rows.length == 0){
                    // stock is not in user_stock table so insert into user_stock
                    let values = [user_id,stock_name,stock_quantity,estimated_Annual_dividends,user_dividend_date];
                    console.log('values is:',values);

                    db.query(`INSERT INTO user_stocks (user_id,name,quantity,total,user_dividend_date) VALUES ($1,$2,$3,$4,$5)`,values,(err)=>{
                        if(err){console.log('insert error is:',err.message);  error = "Error inserting user stock data";}
                        return res.redirect('/');
                    });
                }else{ 
                // update the stock quantity 
                    db.query(`UPDATE user_stocks SET quantity = $1 , total = $4,user_dividend_date=$5 WHERE user_id = $2 AND name = $3`,[stock_quantity,user_id,stock_name,estimated_Annual_dividends,user_dividend_date],(err)=>{
                        if(err)  error = "Error with updating stock data";
                        return res.redirect('/');
                    });
                }

    }else{
        err="Unexpected Error"
        console.log('yields not found');
        return res.redirect('/');
    }
});


app.post('/get-monthly-dividend-history',checkAuthenitcated, async(req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']);
    //get monthly records for dividend calander
    const monthly_records = await db.query(`SELECT * FROM monthly_records where user_id = $1 ORDER BY year,EXTRACT(MONTH FROM TO_DATE(month, 'Mon'))`,[user_id]);
    // console.log(monthly_records.rows)
    res.send(monthly_records.rows)
})

app.post('/delete',(req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']) ;
    db.query(`DELETE FROM user_stocks WHERE id = $1 AND user_id = $2`,[parseInt(req.body.id),user_id],(err)=>{
        if(err) console.log(err.message);
        res.redirect('/');
        console.log('removed id',req.body.id);
    })
})

app.post("/user/register",Validation ,async (req,res)=>{
    let error =  validationResult(req);
    if(error && error.errors[0]){
        registerError = error.errors[0].msg;
        return  res.redirect('/register');
    }

    const isRegistered = await register_user(req,res);
    if(isRegistered != true){
        registerError = 'Enter a differnt Email!'
        return res.redirect('/register');
    }
    loginError = "Successful Registration";
    return res.redirect('/login');
})

app.post("/user/login",Validation ,async(req,res)=>{
    let error = validationResult(req);
    if(error && error.errors[0]){
        loginError = error.errors[0].msg;
        return  res.redirect('/login');
    }
    const isVerified = await login_user(req,res);
    if(isVerified) return res.redirect('/');
    loginError = "Incorrect Email or Password";
    return res.redirect('/login');
});

app.post('/user/logout',(req,res)=>{
    res.clearCookie("token");
    res.redirect('/login');
})
// const hourly_price_updater = schedule.scheduleJob({minute:30,tz:'EST'},hourly_Update_Stock_Price);
const weekly_dividend_date_updater = schedule.scheduleJob({dayOfWeek:0,tz:'EST'},update_yahoo_dividend_dates );
const update_yahoo_dividend_dates_on_1st_day_of_month = schedule.scheduleJob({date:1,hour:7,tz:'EST'},update_yahoo_dividend_dates);
// const user_entered_total_dividends_earned_updater = schedule.scheduleJob({hour:0,minute:1,tz:'EST'},update_user_entered_total_dividends_earned);
const total_dividends_earned_updater = schedule.scheduleJob({hour:0,minute:1,tz:'EST'},update_total_dividends_earned);
const updating_dividend_dates_not_in_yahoo = schedule.scheduleJob({dayOfWeek:0,hour:7,tz:'EST'},updateDividendDatesNotInYahoo);
const setYearlyDividendRecords = schedule.scheduleJob({month:0,hour:0,minute:1,tz:'EST'},setYearlyRecords);
const setMonthyDividendRecords = schedule.scheduleJob({date:25,hour:0,minute:1,tz:'EST'},setMonthlyDividendRecords);

app.listen(port,()=> console.log(`Running on port ${port}`));