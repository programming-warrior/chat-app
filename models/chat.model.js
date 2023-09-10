const mongoose = require('mongoose');



const chatSchema = new mongoose.Schema({
    person1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    person2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    messages: [
        {
            text: String,
            sender:{
                type:mongoose.Schema.Types.ObjectId,
            },
            createdAt:{
                type:Date,
                default:Date.now,
            }
        }
    ] 
});

const Chat=mongoose.model('Chat',chatSchema);

module.exports=Chat;

