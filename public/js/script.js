let addTicker = document.getElementById('add');
let add_data_field = document.getElementById('add-data');
let stock_list = document.getElementById('stock_list');
let submit = document.getElementById('submit');
let x = document.getElementById('close');
let logout = document.querySelector('.logout');
addTicker.addEventListener('click', event => {
        showAddMenu();
});

// shows the add ticker menu
const showAddMenu = ()=>{
    addTicker.style.display='none';
    logout.style.display='none';
    add_data_field.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// deleting itmes from database by making post request
const remove = document.querySelectorAll('.delete');
remove.forEach((button)=> button.addEventListener('click',async ()=>{
    console.log('remove val:',button.getAttribute('data-id'));
    let id = {id:parseInt(button.getAttribute('data-id'))};

    // delete confirm
    let delete_Box = document.querySelector('.cover');
    let cancel_btn = document.querySelector('.cancel_delete');
    let remove_btn = document.querySelector('.verify_delete');
    let stock_name = document.querySelector('.delete_stock_name');
    stock_name.innerText = button.parentElement.querySelector('.edit').getAttribute('data-name');
    delete_Box.style.display = 'grid';
    cancel_btn.addEventListener('click',()=>{
        console.log('clicked cancel');
        delete_Box.style.display = 'none';
    })
    // if delete is clicked again then send post request
    remove_btn.addEventListener('click',()=>{
        fetch("/delete", {
            method: "POST",
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(id)
        }).then(res => {
            // refreshing window to update data
            window.location.reload();
            console.log("Request complete! response:", res);
        });
    })
}))

//on blur function to uncheck chekbox and hide action menu
function setUnchecked(element){
    if (!event.currentTarget.contains(event.relatedTarget))
        element.parentElement.querySelector('input[type="checkbox"]').checked = false
}
//displaying delete confirm 
const delete_confirm  = ()=>{
    let delete_Box = document.querySelector('.delete_confirm');
    let cancel_btn = document.querySelector('.cancel_delete');
    let remove_btn = document.querySelector('.verify_delete');
    delete_Box.style.display = 'block';
    cancel_btn.addEventListener('click',()=>{
        console.log('clicked cancel');
        delete_Box.style.display = 'none';
        return false;
    })
    remove_btn.addEventListener('click',()=>{
        return true;
    })

}

// closing the add menu
x.addEventListener('click',()=>{
    clear();
    addTicker.style.display='inline-block';
    add_data_field.style.display = 'none';
    logout.style.display='block';

})

// editing the stock info
let edit = [...document.getElementsByClassName('edit')];
edit.forEach((button)=> button.addEventListener('click',()=>{
    let id = button.getAttribute('data-id');
    let name = button.getAttribute('data-name')
    let quantity = button.getAttribute('data-quantity')
    let givenId = document.getElementById('given_id');
    //display add stock form 
    showAddMenu();
    let addForm = document.querySelector('#add-data');
    addForm.querySelector('#stock_name').value = name
    addForm.querySelector('#stock_quantity').value = quantity
    addForm.querySelector('#given_id').value = parseInt(id)
}));

// clear the add stock inputs
const clear = ()=>{
    let name = document.getElementById('stock_name');
    let quantity = document.getElementById('stock_quantity');
        name.value =  quantity.value =  '';
}


// hover display of edit and delete
const rows = [...document.getElementsByClassName('inventory')];

const change_Edit_Delete_Display = (item,value,padding) =>{
    item.lastElementChild.style.padding = padding;
    item.lastElementChild.style.transition = '0.2s ease-in';
    item.lastElementChild.firstElementChild.style.display = value;
    item.lastElementChild.lastElementChild.style.display = value;
}

// progress bar
const bar_fill = document.querySelector('.fill')
bar_fill.style.width = bar_fill.dataset.fill;
bar_fill.title = bar_fill.dataset.fill;


// dividend calander functions
const month_element = document.querySelector('.calander-controls .month');
let calander_container = document.querySelector('.calander-container');
let next_month_btn = document.querySelector('.next i');
let previous_month_btn = document.querySelector('.prev i');
let currentYear = new Date().getFullYear()
let all_monthly_data = []
let calander_element_list = []
let current_month_index = 0

const setFullMonthString = ()=>{
    let Mon = month_element.getAttribute('data-month')
    let year = month_element.getAttribute('data-year') 
    let month = new Date(Mon + ' '+ year).toLocaleString('en-us',{month:'long'})
    month = year == currentYear?month: `${month} - ${year}`
    month_element.innerText = month;
}
window.addEventListener('load',()=>{
    setFullMonthString()
})

const displayCalanderForMonth = (month,year,direction='')=>{
    console.log(month,year,month_element)
    calander_element_list.forEach(item=>{
        let dateMatched = item.getAttribute("data-month") == month && item.getAttribute("data-year") == year
        if(dateMatched){
            month_element.dataset.month = month
            month_element.dataset.year = year
            setFullMonthString()
            item.classList.add('show',direction)
        }
        else
            item.classList.remove('show','transition-left','transition-right')
    })
}
//next month event
next_month_btn.addEventListener('click',()=>{
    if(current_month_index == calander_element_list.length-1) return 
    else {
            current_month_index++
            console.log(current_month_index)
            let month = calander_element_list[current_month_index].getAttribute('data-month')
            let year = calander_element_list[current_month_index].getAttribute('data-year')
            displayCalanderForMonth(month,year,'transition-left')
        }
})
//previous month event
previous_month_btn.addEventListener('click',()=>{
    if(current_month_index == 0) return 
    else {
            current_month_index--
            let month = calander_element_list[current_month_index].getAttribute('data-month')
            let year = calander_element_list[current_month_index].getAttribute('data-year')
            displayCalanderForMonth(month,year,'transition-right')
        }
})

const createDividendCalander = ()=>{
    if(!all_monthly_data) return calander_element_list.push(document.querySelector('.calander_data_wrapper'))
    all_monthly_data.forEach(month=>{
        let wrapper = document.createElement('div');
        wrapper.classList.add('calander_data_wrapper')
        wrapper.setAttribute('data-month',month.month)
        wrapper.setAttribute('data-year',month.year)
        // fill with dividend payment dates
        Object.values(month.stock_list).forEach(stock=>{
            let stock_card = document.createElement('div')
            stock_card.classList.add('calander_data')
                stock_card.appendChild(Object.assign(document.createElement('div'),{className:'dividend_date',textContent:stock.dividenddate})); // dividend date
                stock_card.appendChild(document.createElement('section')); 
                stock_card.appendChild(Object.assign(document.createElement('section'),{textContent:stock.name}))
                stock_card.appendChild(Object.assign(document.createElement('section'),{textContent:stock.dividend_per_share.toFixed(2)}))
                stock_card.appendChild(Object.assign(document.createElement('section'),{textContent:stock.expected_dividends.toFixed(2)}))
            wrapper.appendChild(stock_card)
        })
        wrapper.appendChild(Object.assign(document.createElement('h3'),{className:'month-total',textContent:`Total Dividends: ${month.total_dividends.toFixed(2)}`})) // month total dividends
        calander_element_list.push(wrapper);
        calander_container.appendChild(wrapper);
        })
        //pushing the month that was already rendered by server
        calander_element_list.push(document.querySelector('.calander_data_wrapper'))
}
// retrieving dividend monthly data
let monthly_record = [['Month', 'Dividends']]

// fetch line chart data
window.onload = async ()=>{
    await fetch('/get-monthly-dividend-history',{method:'POST'}).then(res=>res.json()).then(record=>{
        if(record){
            record.forEach(stock=>{
                let date = new Date()
                let month = date.toString().substring(4,7);
                let year = date.getFullYear()
                // console.log(stock);
                if(stock.month != month && year != stock.year){
                    all_monthly_data.push(stock)
                    current_month_index++
                }
                //format data for chart
                monthly_record.push([`${stock.month}-${stock.year}`,stock.total_dividends])
            })
            drawLineChart();
            createDividendCalander()
        }
    })
}
//filter to get stocks that are in range to timespan
// format for chart -> [
    //     ['Month', 'Dividends'],
    //     ['Jan-2022',  100],
    // ]
function getDataForTimespan(timespan = 6){
    if(timespan == 100) return monthly_record;
    let numOfMonths = monthly_record.length
    if(numOfMonths < 2) return monthly_record.push([`${new Date(new Date().setMonth(new Date().getMonth() - 1)).toString().substring(4,7)}-${new Date().getFullYear()}`,0]);
    return monthly_record.filter((stock,idx)=> idx == 0 || idx >= Math.ceil(numOfMonths - timespan))
}
let width = window.innerWidth
// adjusting bargraph size
window.addEventListener('resize', function(e){
    if(width !== window.innerWidth){
        drawPieGraph();
        drawBarGraph();
        drawLineChart()
        width = window.innerWidth
    }
});
// <---------------- Google Charts -------------------->
// Pie Graph
const drawPieGraph = ()=>{
let arr = [document.getElementById('piechart_3d').dataset.arr];
        let pie = [];
        pie.push([ 'Stock', 'Anual Dividend' ]);
        let inventory = [...document.getElementsByClassName('inventory')];
        inventory.forEach(item=>{
            let number = parseFloat (item.children[6].innerText.slice(1));
            pie.push([item.firstElementChild.innerText,number]);
        });
        google.charts.load("current", {packages:["corechart"]});
        google.charts.setOnLoadCallback(drawChart);
        function drawChart() {
            var data = google.visualization.arrayToDataTable(
            pie
        );
        var options = {
            title: 'Dividend Portfolio',
            is3D: true,
            backgroundColor: '#232324',
            titleTextStyle: {
                color: '#FFF'
            },
            legend: {textStyle: {color: 'white'}}
            // colors: ['#82ccb0','#73c5a6','#63bf9c','#59ac8c','#4f997d','#45866d','#3b735e','#32604e','#284c3e','#1e392f'],
            // colors:['#a1d9c4','#b1dfce','#c1e5d7','#d0ece1','#e0f2eb','#63bf9c','#59ac8c','#4f997d','#45866d']
        };
        //document.getElementById('piechart_3d').style.transition = '3s ease-in-out';
        var chart = new google.visualization.PieChart(document.getElementById('piechart_3d'));
        chart.draw(data, options);
        }
}
drawPieGraph();
    //Bar Graph
    const drawBarGraph = () =>{
    function drawChart2() {
        // Define the chart to be drawn.
        let yield = document.querySelector('.results').firstElementChild.innerText.substr(22);
            yield = parseFloat(yield.substr(0,yield.length-1))/100;
        let total = parseFloat(document.querySelector('.expected_income').innerText.substring(27))/yield;
            total = parseFloat(total.toFixed(3));
        let year = new Date().getFullYear(); 
        let contribution = parseFloat(document.getElementById('contribution').value)*12 || 0;
        let num_of_years = parseInt(document.getElementById('select_years').value);
        let returns = parseFloat(document.getElementById('returns').value)/100 || 7/100;

        // console.log('contributions:',total, yield,contribution,num_of_years,returns);
        let yearly_data = [];
        yearly_data.push(['Year', 'Dividend Amount','Account Value']);

        for(let i = 0;i<num_of_years;i++){
            total+= (total+contribution)*(returns+yield);
            let dividend = parseFloat((total*yield).toFixed(3));
            //console.log('total yield is',yield,'contribution is:',contribution,'percent increase:',)
            yearly_data.push([`${year+i+1}`,dividend,total]);
        }
        // console.log('total yield is',yield+returns,contribution);
        var data = google.visualization.arrayToDataTable(yearly_data);
        var options = {
            title: 'Annual Dividend with Reinvestment',
            backgroundColor: '#232324',
            titleTextStyle: {
                color: '#FFF'
            },
            colors: ['#32604e','#63bf9c'],
            legend: {textStyle: {color: 'white'}}
        }

        // Instantiate and draw the chart.
        var chart = new google.visualization.ColumnChart(document.querySelector('#bar_graph'));
        chart.draw(data, options);
    }
    document.getElementById('calculate').addEventListener('click',()=>{
        google.charts.setOnLoadCallback(drawChart2);
    })
    
    google.charts.setOnLoadCallback(drawChart2);
}
drawBarGraph();


//draw line chart for dividends earned
function drawLineChart(record=getDataForTimespan()){
    google.charts.load('current', {packages: ['corechart']});
    google.charts.setOnLoadCallback(drawBackgroundColor);

function drawBackgroundColor() {
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'Dogs');
    var data = google.visualization.arrayToDataTable(record);

    var options = {
        title: 'Dividends Earned',
        titleTextStyle: {
            color: '#FFF'
        },
        hAxis: {
            textStyle:{color: '#FFF'},
            gridlines: {
                color: 'none'
            },
        },
        vAxis: {
            textStyle:{color: '#FFF'},
            gridlines: {
                color: 'none'
            },
            viewWindow:{
                min:-1
            }
        },
        selectionMode: 'multiple',
        animation: {
            duration: 500,
            easing: 'inAndOut',
            startup: true
        },
        series: {
            0: { lineWidth: 3.5 }
        },
        colors: ['#63bf9c'],
        curveType: 'function',
        backgroundColor: '#232324',
        enableInteractivity: true,
        legend: {position: 'none'},
        height: 400
    };

    var chart = new google.visualization.LineChart(document.getElementById('linechart'));
    chart.draw(data, options);
    }
}

