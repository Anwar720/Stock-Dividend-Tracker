import axios from 'axios'
import cheerio from 'cheerio'

// ticker must be upper case 
const getStockInfoFromWeb = async (ticker) => { 
    //error handling if ticker not available
    if(!ticker || ticker.length === 0) return []

    return await axios.get(`https://dividendhistory.org/payout/${ticker.toUpperCase()}/`) 
	.then(({ data }) => { 
		const $ = cheerio.load(data); 
		const info = $('#dividend_table tbody tr td').map((_, product) => 
            { 
				const $product = $(product); 
                // console.log('product:',$product)
				return $product.text() 
			}).toArray();
        try{
		 //convert data list into object list
        let info_object_list = []
        for(let i = 11; i >= 0; i-=4){
            info_object_list.push({
                    dividend_data: new Date(info[i-3].replace(/-/g, '\/')).toString().slice(4,15),
                    pay_date:new Date(info[i-2].replace(/-/g, '\/')).toString().slice(4,15),
                    amount:parseFloat(info[i-1].replace(/[$,*]/g,''))
                })
        }
        return info_object_list;
    }catch(e){
        console.log('data not found')
        return []
    }
	});
}
export{ getStockInfoFromWeb }