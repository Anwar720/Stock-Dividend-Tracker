import bcrypt from 'bcrypt';
import { db } from "../model/DBconnection.js";
import jwt from 'jsonwebtoken';

const register_user =  async (req,res)=> {
        const {email,password} = req.body;
        const salt = 10;
        const user = await db.query(`SELECT * FROM users WHERE email = $1 `,[email]);
            if(user.rows.length == 0){
                    const hash = await bcrypt.hash(password,salt);
                    const newUser = `INSERT INTO USERS (email,password) VALUES ($1,$2)`;
                    db.query(newUser,[email,hash],(insertError)=>{
                        if(insertError)console.log('Register db:',err.message);
                    });
                    return true;
        }
        return false;
    };

const login_user = async(req,res)=>{
    const {email,password} = req.body;
    const user = await db.query(`SELECT * FROM users WHERE email = $1 `,[email]);
    if(!user.rows[0]){
        return false;
    }
    const match  = await bcrypt.compare(password,user.rows[0].password)
        if(match){
            var token = jwt.sign({ user_id: user.rows[0].user_id }, process.env.JWT_KEY);
            res.cookie('token',token,{maxAge:24*60*60*1000,httpOnly:true,sameSite:'strict'});
            return true;
        }else{
            return false;
        }
}

export{register_user,login_user}