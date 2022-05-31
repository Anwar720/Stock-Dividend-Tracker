import yahooFinance from "yahoo-finance";

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
//console.log(new Date().toString().substr(0,10))
const monthly_update_dividend_data = async (db)=>{
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
                                dataFromYahoo.calendarEvents.dividendDate:'';
                    yields = parseFloat((yields).toFixed(3));
                    //console.log(stock.name,dataFromYahoo)
                    db.query(`UPDATE stock SET yield=$1,dividenddate=$2 WHERE name=$3`,[yields,dividendDate,stock.name],
                            (err)=>{if(!err)console.log(`updated ${stock.name} dividend data: ${yields}`)});
                }
            });
        }
}

export{hourly_Update_Stock_Price,monthly_update_dividend_data}