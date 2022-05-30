// varify that re-entered password match in registration
document.getElementById("register").addEventListener("submit",(event)=>{
    let password = document.getElementById('password');
    //password.style.background='green';
    let reentered_password = document.getElementById('verify-password');
    let error = document.querySelector('.errors');
    if(password.value !== reentered_password.value){
        error.innerText = 'Passwords dont match!';
        error.style.color="red";
        event.preventDefault();
    }
});
