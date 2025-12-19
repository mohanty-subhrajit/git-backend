require('dotenv').config();
//pakages need for server .
const express = require('express');
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const http = require("http");
//socket import
const {Server} = require('socket.io');

//router inports
const mainRouter = require("./routes/main.router");

const {initRepo} = require("./controllers/init");
const { addRepo } = require('./controllers/add');
const {commitRepo} = require("./controllers/commit");
const {pullRepo} = require("./controllers/pull");
const {pushRepo}=  require("./controllers/push");
const { revertRepo} = require ("./controllers/revert");



yargs(hideBin(process.argv))
.command("start","start a new server",{},startServer)
.command('init',"Initialize a new repository",{},initRepo)
.command('add <file>',"add a file to the repository",(yargs)=>{
    yargs.positional("file",{
        describe:"file to add to the stagging area",
        type:"string",
    });
}, async (argv)=>{
    await addRepo(argv.file);//file path taken by the user
})

.command("commit <message>","you can commit the staged file",(yargs)=>{
    yargs.positional("message",{
        describe:"commit message",
        type:"string",
    });
}, async (argv)=>{
    await commitRepo(argv.message);
})

.command("push","push commits to bucket",{},pushRepo)
.command("pull","pull commit from bucket",{},pullRepo)
.command(
    "revert <commitID>",
    "revert to a specific commit",
    (yargs)=>{
        yargs.positional("commitID",{
            describe: "Commit ID to revert to",
            type:"string",
        });
    },
    async (argv) => {
        await revertRepo(argv.commitID);
    }
)

.demandCommand(1,"you need at least one command").help().argv;

function startServer(){
    const app = express();
    const port = process.env.PORT || 3002;
    
    // Import rate limiters
    const { generalLimiter } = require('./middleware/rateLimiter');

    // Apply rate limiting to all routes
    app.use(generalLimiter);
    
    app.use(cors({origin:"*"}));
    app.use(bodyParser.json());
    app.use(express.json());

    const mongoURI = process.env.MONGODB_URI;
    
    //connecting mongo db
    mongoose
        .connect(mongoURI)
        .then(()=>console.log("mongoDB connected"))
        .catch((err)=>{console.error("unable to connect",err)});

    app.use("/",mainRouter);
    let user ="test";
    const httpServer = http.createServer(app);
    const io = new Server(httpServer,{
        cors:{
            origin:"*",
            methods :["GET","POST"]
        }
    });

    io.on("connection",(socket)=>{
        socket.on("joinRoom",(userID)=>{
            user = userID ;
            console.log("=====");
            console.log(user);
            console.log("=====");
            socket.join(userID);

        });
    });

    const db = mongoose.connection ;

    // db.once("open", async()=>{
    //     console.log("CRUD operaction called");
    //     //CRUD operaction
    // });

    httpServer.listen(port,()=>{
        console.log(`server is running on PORT ${port}`);
    });
}