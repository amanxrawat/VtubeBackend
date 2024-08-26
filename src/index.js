// require('dotenv').config({path:'./env'});
// this also works just fine

import dotenv from 'dotenv'
import express from 'express';
import connectDb from './db/index.js';   

dotenv.config({
    path:'./env'
})

const app = express();

connectDb()