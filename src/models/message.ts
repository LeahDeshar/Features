import mongoose, { CallbackError, Document, Schema } from "mongoose";

interface IMessage extends Document {
  senderId: mongoose.Schema.Types.ObjectId;
  receiverId: mongoose.Schema.Types.ObjectId;
  text?: string;
  image?: string;
}
const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },

    image: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
