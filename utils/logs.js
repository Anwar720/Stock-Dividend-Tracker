import { db } from "../model/DBconnection.js";

const logEvent = async (event)=>{
    let date = new Date().toLocaleString()
    console.log('loggin event',date)
    const client = await db.connect()
    try{
        await client.query(`INSERT INTO all_logs (time,event) VALUES($1,$2)`,[date,event])
    }catch(e){
        console.log('issue with loggin item')
    }
    // release the client
    client.release()
}

// setLog('initial log')

export{
    logEvent
}