import 'dotenv/config'
import express from 'express';
import bodyparser from 'body-parser';
import yahooFinance from 'yahoo-finance';
import cookieParser from 'cookie-parser';
import {db} from './model/DBconnection.js';
import {hourly_Update_Stock_Price,
        monthly_update_dividend_data,
        update_total_dividends_earned,
        update_user_entered_dividend_dates,
        update_user_entered_total_dividends_earned,
        check_if_monthly_dividend_payer } from './middleware/update_data.js';
import { register_user,
        login_user } from './middleware/authentication.middleware.js';
import {verifyJwt,
        checkAuthenitcated,
        checkNotAuthenticated} from './middleware/verification.middleware.js';
import {Validation,
        validationResult} from './middleware/validation.middleware.js';
import {checkStockInDb} from './middleware/checkDB.middleware.js'
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
app.get("/",checkAuthenitcated,async(req,res)=>{
    const {user_id} = verifyJwt(req.cookies['token']);
    const data = await db.query('SELECT  * FROM user_stocks u INNER JOIN stock s ON u.name = s.name WHERE user_id = $1',[user_id]);
    res.render('index',{db:data.rows,error});
    error="";
})

// let nke_data = await yahooFinance.quote("nke",['summaryDetail','price',"calendarEvents"])
// console.log(new Date(nke_data.calendarEvents.exDividendDate).toString(),new Date().toString());


// Adding and updating Stocks
app.post("/", async (req,res)=>{
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
            let dividendDate = (stock_data.calendarEvents && stock_data.calendarEvents.exDividendDate)
                                                            ? stock_data.calendarEvents.exDividendDate.toString().substring(4,15):'';
                yields = parseFloat((yields).toFixed(3));
            let monthly_payer = await check_if_monthly_dividend_payer(stock_name);
            let dividend_amount = (monthly_payer)?yields/12:yields/4;
                console.log('line 92:',stock_name,monthly_payer,dividend_amount);
            // Inserting new Stock data to stock db
            const insert = `INSERT INTO stock(name,price,yield,dividendDate,monthly_payer,dividend_amount) VALUES ($1,$2,$3,$4,$5,$6)`;
            const data = [stock_name.toUpperCase(),price,yields,dividendDate,monthly_payer,dividend_amount];
            db.query(insert,data ,(err,result)=>{
                if(result){
                    console.log('successful insert: ');
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
        console.log("line 113",yields.rows)
        stock_quantity = parseFloat(stock_quantity);
        stock_name = stock_name.toUpperCase();
        let estimated_Annual_dividends = parseFloat(yields.rows[0].yield*stock_quantity).toFixed(4);
            let user_dividend_date = new Date(req.body.user_dividend_date.replace(/-/g, '\/').replace(/T.+/, '') )|| '';
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
                    db.query(`UPDATE user_stocks SET quantity = $1 , total = $4 WHERE user_id = $2 AND name = $3`,[stock_quantity,user_id,stock_name,estimated_Annual_dividends],(err)=>{
                        if(err)  error = "Error with updating stock data";
                        //if(yields.dividenddate == '')update_user_entered_dividend_dates();
                        return res.redirect('/');
                    });
                }

    }else{
        err="Unexpected Error"
        console.log('yields not found');
        return res.redirect('/');
    }


});

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

//hourly_Update_Stock_Price(db)
setInterval(()=>{hourly_Update_Stock_Price(db);},1000*60*60);
setInterval(()=>{monthly_update_dividend_data(db);},1000*60*60*24*21);
setInterval(()=>{update_user_entered_total_dividends_earned()},1000*60*60*24*21);
setInterval(()=>{update_total_dividends_earned()},1000*60*60*24);
setInterval(()=>{update_user_entered_dividend_dates()},1000*60*60*24);
app.listen(port,()=> `Running on port ${port}`);