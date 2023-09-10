const messages = {};
const socket = io();
const chatBox = document.querySelector(".c-openchat__box__info");

const userSearch=document.querySelector('#userSearch');

// const friendCard = document.querySelectorAll(".friendCard");
// friendCard.forEach((element) => {
//   element.addEventListener("click", ()=>{
//     chatBoxInitialization(element);
//   });
// });


socket.on("connect", () => {
  const token = window.localStorage.getItem("clientId");
  socket.emit("send-clientId", { token });
});

socket.on("disconnect", () => {
  console.log("disconnected");
  window.location.href = "http://localhost:4000/";
});


const btn = document.querySelector("#send-btn");

if (btn) {
  btn.addEventListener("click", (e) => {
    const receiverId = btn.parentElement.parentElement.dataset.id;
    const sendBox = document.querySelector("#send-box");

    const msg = sendBox.value;

    if (!messages[receiverId]) {
      messages[receiverId] = [];
    }
    socket.emit("send-message", { id: receiverId, msg }, (res) => {
      if (res === "received") {
        messages[receiverId].push({ msg: msg, send: true });
        populateChatBox(receiverId);
      }
    });
  });
}

socket.on("receive-message", ({ sender, msg }) => {

  const { id, username } = sender;
  if (!messages[id]) {
    messages[id] = [];
  }
  messages[id].push({ msg: msg, send: false });
  populateFriendBox(id, username);
  populateChatBox(id);

});

function populateChatBox(id) {

  if (messages[id] && messages[id].length > 0) {
    const ele = messages[id][messages[id].length - 1];
    const li = document.createElement("li");
    li.classList.add(`${ele.send ? "send" : "receive"}`);
    li.textContent = ele.msg;
    chatBox.firstChild.appendChild(li);
  }
}

function populateFriendBox(id, username) {
  const myId = window.localStorage.getItem("clientId");

  console.log(id);
  console.log(myId);
  if(id===myId){
    console.log('hey');
    return;
  }

  const friendBox = document.querySelector(".friendsBox");


  for(let i=0;i<friendBox.children;i++){
      if(friendBox.children[i].dataset && friendBox.children[i].dataset.id===id){
        return;
      }
  }
  

  const div = document.createElement("div");
  const span = document.createElement("span");
  const i = document.createElement("i");

  span.textContent = username;
  i.classList.add("fa-solid");
  i.classList.add("fa-user");

  div.classList.add("friendCard");
  div.dataset.id = id;

  div.appendChild(i);
  div.appendChild(span);

  div.addEventListener('click',()=>{
    chatBoxInitialization(div);
  })

  friendBox.appendChild(div);
}

async function chatBoxInitialization(element) {
    const id = element.dataset.id;
    chatBox.style.display = "flex";
    chatBox.dataset.id = id;

    chatBox.firstChild.innerHTML='';
    //fetch the chats
    const myId = window.localStorage.getItem("clientId");
    const url = `http://localhost:4000/chat/${id}-${myId}`;
    const res = await fetch(url);

    if (res.status == 200 || res.status == 201) {
      const data = await res.json();
      messages[id] = [];
      data.forEach((d) => {
        messages[id].push(d);
        populateChatBox(id);
      });
    }
}


userSearch.addEventListener('change',async()=>{
    const param=userSearch.value;
    const res=await fetch('http://localhost:4000/user/'+param);
    if(res.status==200 || res.status==201){
      const {id,username}=await res.json();
      console.log(username);
      populateFriendBox(  id,username)
    }
})