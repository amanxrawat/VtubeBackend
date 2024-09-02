import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/APIError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/APIResponse.js'
import jsonwebtoken from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while creating refresh and access token  for the user .")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const {fullName , userName , email , password  } = req.body

    if(
        [fullName,userName,email,password].some((field)=>field?.trim ==='')
    ){
        throw new ApiError(400,"all fiels are required")
    };

    const existingUser = await User.findOne({
        $or:[{userName},{email}]
    })

    if(existingUser){
        throw new ApiError(409,"user with email or user name alread exits")
    }

    // console.log(req.file?.avatar[0]?.path)  -- showing undefined
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar image is required");
    }



    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400,"avatar image is required");
    }
    
    // console.log("____________________________first \n")
    // console.log(coverImage.url);
    // console.log("____________________________\n")

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        userName:userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw ApiError(500,'something went wrong while registering the user')
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registerd Successfully")
    )

})


// register user
// get user details from frontend
// validation - not empty
// check if user alread exist-using username and email
// check for images 
// check for avatar
// upload them to cloudnary 
// extract url and save the url
// create user now 
// check for user creation



const loginUser = asyncHandler(async(req,res)=>{
    // algo for login user
    // email and password from the user
    // check if a user exist with the givern email other wise error
    // check the password
    // generate access and refresh token and save them on users brower and database.
    // then reroute the user to home --> this will be done in the user route

    const {email,userName , password} = req.body

    if([email,userName,password].some((field)=>field==="" )){
        throw new ApiError(400 , 
            "email,userName and password is needed to login pls enter email and password"
        )
    }

    const user = await User.findOne({
        
        $or:[{email:email},{userName}]
        
        })

    if(!user){
        throw new ApiError(403,"user does not exist and don't have the access rights ")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "invalid user credentials ");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",accessToken,options)
    .cookie("refreshToken ", refreshToken , options).json(
        new ApiResponse(200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
        )
    )


})


const logOutUser = async(req , res)=>{
    
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken:undefined,
            }
        },  
        {
            new:true
        }
    )

    const options ={
        httpOnly:true,
        secure:true
    }
    // return res.status(200).cookie("refreshToken","",options)
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out successfully"))
    
}
    
const refreshAccessToken = async(req,res)=>{
    const incommingAccessToken = req.cookies.refreshToken||req.body.refreshToken
    if(!incommingAccessToken){
        throw new ApiError(401,"unauthorized request")
    }
    
    try {
        const decodeToken = jsonwebtoken.verify(incommingAccessToken,process.env.ACCESS_TOKEN_SECRET)
        
        
        const user = await User.findById(decodeToken?._id)
        if(!user){
            throw new ApiError(401,"unauthorized request")
        }
    
        if(incommingAccessToken !== user?.refreshToken){
            throw new ApiError(401, " refresh token is expired or used ");
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res.status(200).cookie("accessToken",accessToken,options)
        .cookie("refeshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                {accessToken,refreshToken:newrefreshToken},
                "access token refreshed successfully "
            )
        )
    
    } catch (error) {
        throw new ApiError(401,"invalid refresh token")
    }
    

}
    
export {registerUser,loginUser, logOutUser , refreshAccessToken}