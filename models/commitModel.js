const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommitSchema = new Schema({
  commitId: {
    type: String,
    required: true,
    unique: true,
  },
  repositoryId: {
    type: Schema.Types.ObjectId,
    ref: "Repository",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  files: [
    {
      filename: String,
      path: String,
    },
  ],
  s3Path: {
    type: String, // commits/{commitId}/
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Commit = mongoose.model("Commit", CommitSchema);
module.exports = Commit;
