import {check,validationResult} from 'express-validator';
let Validation = [
    check('email','Please include a valid email').escape().not().isEmpty().isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('password', 'Password must be 8 or more characters').isLength({ min: 8 })
]
const validate_stock_input = (req)=>{
    const valid_name =  /^[A-Za-z]+$/;
    return valid_name.test(req.body.stock_name) && !valid_name.test(req.body.stock_quantity) && req.body.stock_quantity > 0;
}

export{
    Validation,
    validationResult,
    validate_stock_input
}