//requiring object id from mongo db
let ObjectId = require("mongodb").ObjectId; 

const getAllUsers = async  (req, res) => {
   try{
    await connectClient();
    const db = client.db('Lapit');
    const usersCollection = db.collection("users");

    //found a error and fix circular error . i conver the res to js-Array so that we can see it as json
    const users = await usersCollection.find({}).toArray();
    res.json(users);
   }catch(err){ 
    console.error("Error during featching :",err.message);
    res.status(500).send("Server error!");
   }
};


//JSON web token JWT based
const jwt = require('jsonwebtoken');
const  bcrypt = require("bcryptjs");
const {mongoClient, MongoClient, ReturnDocument }= require('mongodb');
const dotenv = require('dotenv');
const { required } = require('yargs');
dotenv.config();
const uri = process.env.MONGODB_URI;
let client;
//connectin to the client to the db.
async function connectClient() {
    if(!client){
        client = new MongoClient(uri);
        await client.connect();
    }
}
const signup = async (req, res) => {
  const {username,password,email}= req.body ;
  try{
    await connectClient();
    const db = client.db("Lapit");
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({username});
    if(user){
        return res.status(400).json({message:"User already exists!"});
    }

    const salt = await bcrypt.genSalt(15);
    const hashedPassword = await bcrypt.hash(password,salt);

    const newUser ={
        username,
        password:hashedPassword,
        email,
        repositories:[],
        followedusers:[],
        starRepos:[]

    }
    const result = await usersCollection.insertOne(newUser);

    const token = jwt.sign({id:result.insertedId},process.env.JWT_SECRET_KEY,{expiresIn:"72h"});
    res.json({token,userId:result.insertedId});
  }catch(err){
    console.error("Error during signup:",err.message);
    res.status(500).send("server error");

  }
  
};


//login logic
const login =  async (req, res) => {
  const {email,password}= req.body;
  try{
    await connectClient();
    const db = client.db("Lapit");
    const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({email});
    if(!user){
        return res.status(401).json({message:"Invalid credentials !"});
    }

    const isMatch = await bcrypt.compare(password,user.password);
    //worning for if  the user give valiad password or not.
    if(!isMatch){
        return res.status(401).json({message:"Invalid credentials!"});
    } 

    const  token = jwt.sign({id:user._id},process.env.JWT_SECRET_KEY,{expiresIn:"30h"});
    res.json({token,userId:user._id});
 }catch(err){
    console.error("Error during login",err.message);
    res.status(500).send("Server error!");
 };
};


const getUserProfile = async (req, res) => {
    const currentID = req.params.id;
    try{
        await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
            _id: new ObjectId(currentID)
        });

        if(!user){
            return res.status(404).json({message:"user Not found"});
        }

        res.send(user);

    }catch(error){
        console.error("Error during fetching:",error.message);
        res.status(500).send("Server error!");
    }

};


const updateUserProfile = async (req, res) => {
    const currentID = req.params.id ;
    const{email,password}= req.body;
    
    try{
         await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");

        //checking email
        let updateFields ={email};
        if(password){
            //hashing the new passwrod.
            const salt = await bcrypt.genSalt(15);
            const hashedPassword = await bcrypt.hash(password,salt);
            updateFields.password = hashedPassword;
        }
        const result = await usersCollection.findOneAndUpdate({
            _id: new ObjectId(currentID)
        },{$set:updateFields},{ReturnDocument:"after"});
        if(!result.value){
            return res.status(404).json("user not found");
        }
        res.send(result.value);
    }catch(err){
        console.error("Error during updating:",err.message);
        res.status(500).send("Server error!");
    }
  
};

const deleteUserProfile = async (req, res) => {
    const currentID = req.params.id ;
    try{
         await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");


        const result = await usersCollection.deleteOne({
            _id: new ObjectId(currentID),
        });
        if(result.deleteCount == 0){
            return res.status(404).json({message:"User not Found!"});
        }
        res.json({message:"User profile Deleted"});
    }catch(err){
        console.error("Error during deleting:",err.message);
        res.status(500).send("Server error!");
    } 
};

// Star/Unstar repository
const toggleStarRepo = async (req, res) => {
    const userId = req.params.userId;
    const repoId = req.params.repoId;
    
    try{
        await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
            _id: new ObjectId(userId)
        });

        if(!user){
            return res.status(404).json({message:"User not found!"});
        }

        const starRepos = user.starRepos || [];
        const repoObjectId = new ObjectId(repoId);
        const isStarred = starRepos.some(id => id.toString() === repoId);

        let updateOperation;
        if(isStarred){
            updateOperation = { $pull: { starRepos: repoObjectId } };
        } else {
            updateOperation = { $addToSet: { starRepos: repoObjectId } };
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            updateOperation
        );

        res.json({ 
            message: isStarred ? "Repository unstarred" : "Repository starred",
            isStarred: !isStarred 
        });
    }catch(err){
        console.error("Error during star toggle:",err.message);
        res.status(500).json({message:"Server error!"});
    }
};

// Get starred repositories
const getStarredRepos = async (req, res) => {
    const userId = req.params.userId;
    
    try{
        await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");
        const reposCollection = db.collection("repositories");

        const user = await usersCollection.findOne({
            _id: new ObjectId(userId)
        });

        if(!user){
            return res.status(404).json({message:"User not found!"});
        }

        const starredRepoIds = (user.starRepos || []).map(id => new ObjectId(id));
        const starredRepos = await reposCollection.find({
            _id: { $in: starredRepoIds }
        }).toArray();

        res.json(starredRepos);
    }catch(err){
        console.error("Error fetching starred repos:",err.message);
        res.status(500).json({message:"Server error!"});
    }
};

// Follow/Unfollow user
const toggleFollowUser = async (req, res) => {
    const currentUserId = req.params.userId;
    const targetUserId = req.params.targetUserId;
    
    try{
        await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");

        const currentUser = await usersCollection.findOne({
            _id: new ObjectId(currentUserId)
        });

        if(!currentUser){
            return res.status(404).json({message:"User not found!"});
        }

        const followedUsers = currentUser.followedusers || [];
        const targetUserObjectId = new ObjectId(targetUserId);
        const isFollowing = followedUsers.some(id => id.toString() === targetUserId);

        let updateOperation;
        if(isFollowing){
            updateOperation = { $pull: { followedusers: targetUserObjectId } };
        } else {
            updateOperation = { $addToSet: { followedusers: targetUserObjectId } };
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(currentUserId) },
            updateOperation
        );

        res.json({ 
            message: isFollowing ? "User unfollowed" : "User followed",
            isFollowing: !isFollowing 
        });
    }catch(err){
        console.error("Error during follow toggle:",err.message);
        res.status(500).json({message:"Server error!"});
    }
};

// Get followers and following
const getFollowersAndFollowing = async (req, res) => {
    const userId = req.params.userId;
    
    try{
        await connectClient();
        const db = client.db("Lapit");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({
            _id: new ObjectId(userId)
        });

        if(!user){
            return res.status(404).json({message:"User not found!"});
        }

        // Get following
        const followingIds = (user.followedusers || []).map(id => new ObjectId(id));
        const following = await usersCollection.find({
            _id: { $in: followingIds }
        }).project({ password: 0 }).toArray();

        // Get followers (users who follow this user)
        const followers = await usersCollection.find({
            followedusers: new ObjectId(userId)
        }).project({ password: 0 }).toArray();

        res.json({ 
            followers,
            following,
            followersCount: followers.length,
            followingCount: following.length
        });
    }catch(err){
        console.error("Error fetching followers/following:",err.message);
        res.status(500).json({message:"Server error!"});
    }
};

module.exports = {
  getAllUsers,
  signup,
  login,
  getUserProfile, 
  updateUserProfile,
  deleteUserProfile,
  toggleStarRepo,
  getStarredRepos,
  toggleFollowUser,
  getFollowersAndFollowing,
};
