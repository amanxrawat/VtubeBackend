import mongoose  from "mongoose";
import { DB_NAME } from "../constants.js";

const  connectDb = async()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`\n Mongo Db connection successful :: HOST ${connectionInstance.connection.host}`);
        console.log(` \n connection instance is ${connectionInstance}`);


    }catch(error){
        console.log("mongo db connection failed ", error);
        process.exit(1);
    }
}

export default connectDb;