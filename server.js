//dependencies
const express = require("express");
const app = express();
const port = 4000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const server = require("http").createServer(app);
const io = socketIo(server);

const User = require("./models/user.model");
const Chat = require("./models/chat.model");

//global variables
const secretKey = "paoerqwhrioqwehrapireQjeowryq-o";
const uri =
  "mongodb+srv://<user>:<password>@cluster0.sfnvtv8.mongodb.net/?retryWrites=true&w=majority";
const connectedClients = {};

//default settings
app.set("view engine", "pug");
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(0);
  });

function checkAuthorization(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  jwt.verify(token, secretKey, (err, id) => {
    if (err) {
      return res.redirect("/login");
    }
    req.id = id.id;
    next();

  });
}

app.get("/", checkAuthorization, async (req, res) => {
  const user = await User.findOne({ _id: req.id });

  const username = user.username;

  const data = {
    username,
  };

  res.render("index", data);
});


app.get('/chat/:id',async(req,res)=>{
    const id=req.params.id;
    const receiverId=id.split('-')[0];
    const clientId=id.split('-')[1];


    const chat=await Chat.findOne({
      $or: [
          { person1: clientId, person2: receiverId},
          { person1: receiverId, person2: clientId},
      ],
    });

    if(chat && chat.messages.length>0 ){
      let messages=[];
      chat.messages.forEach(m=>{
        let send=false;
        if(m.sender.toString('hex')===clientId){
          send=true;
        }
        messages.push({msg:m.text,send});
      })
      return res.status(200).json(messages);
    }
    res.status(404).end();
})


app.get('/user/:username',async(req,res)=>{
  const username=req.params.username;

  const user=await User.findOne({username:username});

  const data={id:user._id,username:user.username};

  res.status(200).json(data);
})


app.get("/login", (req, res) => {
  res.render("login.pug");
});

app.post("/api/signin", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  username =
    typeof username === "string" && username.trim().length > 0
      ? username
      : null;
  password =
    typeof username === "string" && password.trim().length > 0
      ? password
      : null;

  if (!username || !password) {
    res.status(400);
    res.send("invalid inputs");
    return;
  }

  const user = await User.findOne({ username });

  if (!user) {
    res.status(404);
    res.send("no user found");
    return;
  }

  if (user.password === password) {
    const token = jwt.sign({ id: user._id }, secretKey);

    res.status(201);
    res
      .cookie("token", token, {
        maxAge: 2 * 60 * 60 * 1000,
        httpOnly: true,
      })
      .json({ id: user._id.toString("hex") });
  } else {
    res.status(403);
    res.send("wrong credentials");
  }
});

app.post("/api/signup", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let email = req.body.email;

  //data sanitization
  username =
    typeof username === "string" &&
    username.trim().length < 40 &&
    username.trim().length > 5
      ? username
      : null;
  password =
    typeof username === "string" &&
    password.trim().length < 40 &&
    password.trim().length >= 10
      ? password
      : null;
  email = typeof email === "string" && email.trim().length > 0 ? email : null;

  if (!username || !password || !email) {
    res.status(400);
    res.send("invalid inputs");
    return;
  }

  const existingUser = await User.find({ username });
  if (existingUser.length > 0) {
    res.status(401).send("user already exists");
    return;
  }

  const user = new User({
    username,
    password,
    email,
  });
  try {
    await user.save();

    const token = jwt.sign({ id: user._id }, secretKey);

    res.status(201);
    res
      .cookie("token", token, {
        maxAge: 2 * 60 * 60 * 1000,
        httpOnly: true,
      })
      .json({ id: user._id.toString("hex") });
  } catch (e) {
    console.log(e.message);
    res.status(500);
    res.send("something went wrong");
  }
});

//socket io connections
io.on("connection", (socket) => {
  let clientId = "";
  socket.on("send-clientId", ({ token }) => {
    clientId = token;
    connectedClients[socket.id] = clientId;
    activateSocketListeners(clientId, socket);
  });

  socket.on("disconnect", () => {
    delete connectedClients[socket.id];
  });
});

function activateSocketListeners(clientId, socket) {
  socket.on("send-message", async ({ id, msg }, callback) => {

    let receiverId = "";

    for (let key in connectedClients) {
      if (connectedClients[key] === id) {
        receiverId = key;
        break;
      }
    }
    if (receiverId) {
      //store the chats in the databases
      try {

        const clientIdObj = new mongoose.Types.ObjectId(clientId);
        const receiverIdObj =new mongoose.Types.ObjectId(connectedClients[receiverId]);


        let chat = await Chat.findOne({
          $or: [
            { person1: clientIdObj, person2: receiverIdObj},
            { person1: receiverIdObj, person2: clientIdObj},
          ],
        });


        if (chat) {
          //chat already exists
          chat.messages.push({ text: msg ,sender:clientIdObj});
          chat
            .save()
            .then(async() => {
              callback("received");
                const user=await User.findOne({_id:clientId});

                const senderInfo={id:clientId,username:user.username};

                io.to(receiverId).emit("receive-message", {
                  sender: senderInfo,
                  msg,
                });
            })
            .catch((e) => {
              console.log(e);
            });
        } 
        else {

          chat =new Chat({
            person1: clientIdObj,
            person2: receiverIdObj,
            messages: [{ text: msg ,sender:clientIdObj}],
          });

          chat
            .save()
            .then(async() => {
              callback("received");

              const user=await User.findOne({_id:clientId});

              const senderInfo={id:clientId,username:user.username};
              console.log(senderInfo);
              io.to(receiverId).emit("receive-message", {
                sender: senderInfo,
                msg,
              });
            })
            .catch((e) => {
              console.log(e);
            });
        }
      } catch (e) {
        console.log(e);
      }
    }
  });
}

server.listen(port, () => {
  console.log("the server is listening on port: " + port);
});
