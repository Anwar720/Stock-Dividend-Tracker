import jwt from "jsonwebtoken";

const verifyJwt = (token,res)=>{
    const verified = jwt.verify(token,process.env.JWT_KEY,
        (err,result)=>{
            if(err) {
                res.clearCookie("token");
                return res.redirect('/');
            }
            if(result.user_id) return result;
            return undefined;
        });
        return verified;
}

const checkNotAuthenticated = (req,res,next)=>{
    let token = undefined;
    try{ 
        token = req.cookies['token'];
    } catch(err){console.log('token error of:',err)}
    if(token != undefined ) return res.redirect('/');
    return next();
}

const checkAuthenitcated = (req,res,next)=>{
    const token = req.cookies['token'] || '' ;
    if(token == '') return res.redirect("/login");
    let verified = verifyJwt(token,res);
    if(verified){
        return next();
    }
    return res.redirect("/login");;
}
export{verifyJwt,checkAuthenitcated,checkNotAuthenticated}