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
    console.log(coverImage.url);
    console.log(coverImage);
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

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword , newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "invalid old password ")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200, {} , " password changed Successfully "))

})


const getCurrentUser = asyncHandler(async (req ,res)=>{
    return res
    .status(200)
    .json(200,req.user , "current user fetched successfully ")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName , email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400,'all fiels are required');
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"account details updated successfully "))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading avatar no url present from cloudinary")
    }

    // const user = User.findById(req.user?._id);
    const user = await user.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"avatar updated successfully"))

})  

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading coverImage no url present from cloudinary")
    }

    // const user = User.findById(req.user?._id);
    const user = await user.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))
    
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {userName} = req.params;

    if(!userName?.trim()){
        throw new ApiError(400,"user not found ");
    }

    const channel = await User.aggregate([
        {
            $match:{
                userName : userName?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:'_id',
                foreignField:'channel',
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:'_id',
                foreignField:'subscriber',
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                subscribedChannelCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id , "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project:{
                fullName:1,
                userName:1,
                subscribedChannelCount:1,
                subscribedChannelCount:1,
                isSubscribed:1,
                email:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400,"channel doesn't exist : ")
    }

    res.status(200)
    .json(200,channel[0],"user channel detials fetched successfully");

})

    
export {registerUser,loginUser, 
     logOutUser ,
     refreshAccessToken , 
     changeCurrentPassword , 
     getCurrentUser, 
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile
    }