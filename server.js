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
        updateSingleDateAndDateListNotInYahoo,
        insertNewStockInDB,
        addStockToUserStockList   } from './middleware/update_data.js';
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
import session from 'express-session'
import  flash from 'express-flash'

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

// flash session
app.use(cookieParser('keyboard cat'));
app.use(session({ secret: process.env.SESSION_KEY,
                    saveUninitialized: true,
                    resave: true,
                    cookie: { maxAge: 60000 }}));
app.use(flash());

// render get requests
app.get("/login",checkNotAuthenticated,(req,res)=>{
    res.render("login");
})

app.get("/register",checkNotAuthenticated ,(req,res)=>{
    res.render("register");
})

// render home page
app.get("/",checkAuthenitcated,async(req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']);
    const year = new Date().getFullYear();
    //get stock data
    const data = await db.query('SELECT  * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE user_id = $1',[user_id]);
    //get dividend records for dividends earned this year
    const yearly_records = await db.query(`SELECT * FROM yearly_records WHERE user_id = $1 and year = $2`,[user_id,year])
    res.render('index',{db:data.rows,yearly_records:yearly_records.rows[0]});
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
        req.flash('error', "Invalid Ticker Info");
        return res.redirect("/");
    }
    const {user_id} = verifyJwt(req.cookies['token']) ;
    let {stock_name,stock_quantity} = req.body;
    const dbResult = await db.query(`SELECT * FROM stock WHERE name = $1`,[`${stock_name.toUpperCase()}`]);
    const isStockFoundInDb = dbResult.rows.length !== 0

    if(!isStockFoundInDb){
        try{// Inserting new Stock data to stock database
            await insertNewStockInDB(req,res,stock_name)
        }catch(e){
            req.flash('error', "Error Inserting stock");
            return res.redirect('/');
        }
    };

    try{ // Insert data in user_stock table
        await addStockToUserStockList(user_id, stock_name.toUpperCase(), parseFloat(stock_quantity))
    }catch(e){
        console.log('error:',e.message)
        req.flash('error', "Unexpected Error adding stock");
    }
    return res.redirect('/');

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
        req.flash('error', error.errors[0].msg);
        return  res.redirect('/register');
    }

    const isRegistered = await register_user(req,res);
    if(isRegistered != true){
        
        req.flash('error','Enter a differnt Email!')
        return res.redirect('/register');
    }
    req.flash('success',"Successful Registration");
    return res.redirect('/login');
})

app.post("/user/login",Validation ,async(req,res)=>{
    let error = validationResult(req);
    if(error && error.errors[0]){
        req.flash('error',error.errors[0].msg);
        return  res.redirect('/login');
    }
    const isVerified = await login_user(req,res);
    if(isVerified) return res.redirect('/');
    req.flash('error',"Incorrect Email or Password");
    return res.redirect('/login');
});

app.post('/user/logout',(req,res)=>{
    res.clearCookie("token");
    res.redirect('/login');
})
const hourly_price_updater = schedule.scheduleJob({minute:30,tz:'EST'},hourly_Update_Stock_Price);
const weekly_dividend_date_updater = schedule.scheduleJob({dayOfWeek:0,tz:'EST'},update_yahoo_dividend_dates );
const update_yahoo_dividend_dates_on_1st_day_of_month = schedule.scheduleJob({date:1,hour:7,tz:'EST'},update_yahoo_dividend_dates);
// const user_entered_total_dividends_earned_updater = schedule.scheduleJob({hour:0,minute:1,tz:'EST'},update_user_entered_total_dividends_earned);
const total_dividends_earned_updater = schedule.scheduleJob({hour:0,minute:1,tz:'EST'},update_total_dividends_earned);
const updating_dividend_dates_not_in_yahoo = schedule.scheduleJob({dayOfWeek:0,hour:7,tz:'EST'},updateDividendDatesNotInYahoo);
const MonthStartupdating_dividend_dates_not_in_yahoo = schedule.scheduleJob({date:1,hour:7,tz:'EST'},updateDividendDatesNotInYahoo);
const setYearlyDividendRecords = schedule.scheduleJob({month:0,hour:0,minute:1,tz:'EST'},setYearlyRecords);
const setMonthyDividendRecords = schedule.scheduleJob({date:25,hour:0,minute:1,tz:'EST'},setMonthlyDividendRecords);

app.listen(port,()=> console.log(`Running on port ${port}`));