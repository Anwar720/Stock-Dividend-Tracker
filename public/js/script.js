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
    stock_name.innerText = button.parentElement.parentElement.firstElementChild.innerText;
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
    let name = document.getElementById('stock_name');
    let quantity = document.getElementById('stock_quantity');
    let givenId = document.getElementById('given_id');
    showAddMenu();
    let parent = button.parentElement.parentElement;
    name.value = parent.firstElementChild.innerHTML;
    quantity.value = parent.children[2].innerHTML;
    givenId.value = parseInt(id);
    console.log(id,'parent is:',parent,'first:',parent.children[0].innerHTML)
}));

// clear the add stock inputs
const clear = ()=>{
    let name = document.getElementById('stock_name');
    let quantity = document.getElementById('stock_quantity');
        name.value =  quantity.value =  '';
}


// hover display of edit and delete
const rows = [...document.getElementsByClassName('inventory')];
rows.forEach(item => item.addEventListener('mouseenter',()=>{
    change_Edit_Delete_Display(item,'inline-block','5px');
}))
rows.forEach(item => item.addEventListener('mouseleave',()=>{
    change_Edit_Delete_Display(item,'none',0);
}))

const change_Edit_Delete_Display = (item,value,padding) =>{
    item.lastElementChild.style.padding = padding;
    item.lastElementChild.style.transition = '0.2s ease-in';
    item.lastElementChild.firstElementChild.style.display = value;
    item.lastElementChild.lastElementChild.style.display = value;
}


// adjusting bargraph size
window.addEventListener('resize', function(){
    drawPieGraph();
    drawBarGraph();
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
        var options = {title: 'Annual Dividend with Reinvestment'}; 

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
