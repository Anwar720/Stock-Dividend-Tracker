import yahooFinance from "yahoo-finance";
// updates all stock infomation periodically

// const  update_stock_data = (db)=>{
//     db.query('SELECT * FROM stock ;', (err,data)=>{
//         if(err)  return;
//         data.rows.forEach((async item=>{
//             // let result  = await yahooFinance.quote(item.name,['summaryDetail'],(err)=> {if(err) console.log("yahooFinance update error:",err)})
//             let result  = await yahooFinance.quote(item.name,['summaryDetail','price',"calendarEvents"],(err)=> {if(err) console.log("yahooFinance update error:",err)})
//             let yields = result.summaryDetail.dividendRate || result.summaryDetail.trailingAnnualDividendRate ||result.summaryDetail.yield *result.summaryDetail.open || 0;
//             let price = result.price.regularMarketPrice || result.summaryDetail.open;
//             let dividendDate = (result.calendarEvents && result.calendarEvents.dividendDate )?result.calendarEvents.dividendDate:'';
//             yields = parseFloat((yields).toFixed(3));
//             let expected_total = parseFloat((yields * item.quantity).toFixed(3));
//             let insert = `UPDATE stock SET price = ${price}, yield=${yields},total =${expected_total},dividendDate='${dividendDate}' WHERE id = ${parseInt(item.id)}`;
//             db.query(insert, (err) =>{
//                 if(err) console.log('Updating : ',insert,'Error is:',err);
//                 else console.log('successful update to db:',item.name);
//             });
//         }
//             ));
//     })
//     return;
// }

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