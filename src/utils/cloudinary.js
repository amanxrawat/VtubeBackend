import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import { fileURLToPath } from 'url';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY
  });


  const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath){
            return null
        }

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'
        })
        fs.unlinkSync(localFilePath);
        console.log("response from the cloudinary",response);
        // console.log(response.url)
        return response

    }catch(error){
        fs.unlinkSync(localFilePath) //remove the file from the local server
        console.log("cloudinary upload failed : || ", error);
        return null;
    }
  }


  export {uploadOnCloudinary}