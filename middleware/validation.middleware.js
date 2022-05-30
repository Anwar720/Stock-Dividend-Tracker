import {check,validationResult} from 'express-validator';
let Validation = [
    check('email','Please include a valid email').escape().not().isEmpty().isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('password', 'Password must be 8 or more characters').isLength({ min: 8 })
]

export{
    Validation,validationResult
}