//using fs for  creating hidden folders
const fs = require('fs').promises;
const path = require("path");

async function initRepo(){
    const repoPath = path.resolve(process.cwd(),".Lapit");
    const commitsPath = path.join(repoPath,"commits");
    //we use async function because file creation takes some time
    try{
        //inside Lapit folder the commit folder will be instaly created by the use of recursive
        await fs.mkdir(repoPath,{recursive:true});
        await fs.mkdir(commitsPath,{recursive:true })
        await fs.writeFile(
            path.join(repoPath,"config.json"),
            JSON.stringify({bucket: process.env.S3_BUCKET})//S3 env setting will be there fo codes to go to the bucket
        );
        console.log("repository initialised ")
    }catch(err){
        console.error("error intializing repository",err)
    }
}

module.exports = {initRepo}