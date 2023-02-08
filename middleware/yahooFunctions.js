import { check_if_monthly_dividend_payer } from './update_data.js';
import yahooFinance from 'yahoo-finance';

const formatStockData = async (stock_data,stock_name)=>{
    
    let yields = stock_data.summaryDetail.dividendRate ||   
                    stock_data.summaryDetail.trailingAnnualDividendRate ||    
                    stock_data.summaryDetail.yield *stock_data.summaryDetail.open || 0;   
    let price = stock_data.price.regularMarketPrice || stock_data.summaryDetail.open;  
    let dividendDate = (stock_data.calendarEvents && stock_data.calendarEvents.dividendDate)  
                                                    ? stock_data.calendarEvents.dividendDate.toString().substring(4,15):'';   
        yields = parseFloat((yields).toFixed(3));  
    let monthly_payer = await check_if_monthly_dividend_payer(stock_name);    
    let dividend_amount = (monthly_payer)?yields/12:yields/4;   
    let is_date_in_yahoo = dividendDate.length > 0
    
    return {
        yields,
        price,
        dividendDate,
        monthly_payer,
        dividend_amount,
        is_date_in_yahoo
    }
}


const getFormatedStockDataFromYahoo = async (stock_name)=>{
    let stock_data = {};
    try{
        stock_data  = await yahooFinance.quote(`${stock_name}`,['summaryDetail','price',"calendarEvents"])
    }catch(err){
        console.log('🔥error retriving yahoo data:',err.message);
        throw 'ticker not found'
        return 
    }

    try{ // in case stock exists but may be delisted
        stock_data.summaryDetail.shortName;
    }catch(err){
        throw 'stock maybe delisted'
        return 
    }

    return await formatStockData(stock_data,stock_name)
}
// console.log(getFormatedStockDataFromYahoo('AAPL'))
export{
    formatStockData,
    getFormatedStockDataFromYahoo
}