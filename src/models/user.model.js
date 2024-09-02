import mongoose from "mongoose";
import jsonwebtoken from "jsonwebtoken";
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    userName:{
        type:String,
        required: true,
        unique:true,
        trim:true,
        index:true,
        lowercase:true,
    },
    email:{
        type:String,
        required: true,
        unique:true,
        trim:true,
        lowercase:true,
    },
    fullName:{
        type:String,
        required: true,
        trim:true,
        index:true,
    },
    avatar:{
        type:String,
        required:true
    },
    coverImage:{
        type:String,

    },
    watchHistory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'video'
    },
    password:{
        type:String,
        required:[true,'password is required']
    },
    refreshToken:{
        type:String
    },
    

},{timestamps:true})


userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        return next();
    }
    this.password = await bcrypt.hash(this.password,10)
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);

}

userSchema.methods.generateAccessToken = async function(){
    return await jsonwebtoken.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:ACCESS_TOKEN_EXPIRY
        }
    )
}    

userSchema.methods.generateRefreshToken = async function(){
    return await jsonwebtoken.sign(
        {
            _id:this._id,
        },
        process.env.REFERSH_TOKEN_SECRET,
        {
            expiresIn:REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model('user',userSchema);