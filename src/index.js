// require('dotenv').config({path:'./env'});
// this also works just fine

import dotenv from 'dotenv'
import connectDb from './db/index.js';   
import {app} from './app.js';
import { Router } from 'express';

dotenv.config({
    path:'./.env'
})

connectDb()
.then(()=>{
    app.on("error",(error)=>{
        console.log('error in starting the app in index.js || ',error);
        throw error;
    })

    app.listen(process.env.PORT,()=>{
        console.log(`sever is running at port :${process.env.PORT} `)
    })
})
.catch((err)=>{
    console.log("Mongo DB failed to connect ",err);
})