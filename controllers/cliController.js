const { s3, S3_BUCKET } = require("../config/aws-config");
const Repository = require("../models/repoModel");
const Commit = require("../models/commitModel");
const mongoose = require("mongoose");

// Initialize repository via CLI
async function cliInitRepo(req, res) {
  const { userId, repoName } = req.body;

  try {
    if (!repoName) {
      return res.status(400).json({ error: "Repository name is required!" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid User ID!" });
    }

    // Check if repo already exists
    const existing = await Repository.findOne({ name: repoName, owner: userId });
    if (existing) {
      return res.status(200).json({
        message: "Repository already exists",
        repositoryId: existing._id,
        repoName: existing.name,
      });
    }

    // Create new repository
    const newRepository = new Repository({
      name: repoName,
      description: `Repository ${repoName} created via CLI`,
      visibility: true,
      owner: userId,
      content: [],
      issues: [],
      commits: [],
      cliInitialized: true,
    });

    const result = await newRepository.save();

    res.status(201).json({
      message: "Repository initialized via CLI",
      repositoryId: result._id,
      repoName: result.name,
    });
  } catch (err) {
    console.error("Error initializing repository via CLI:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Save commit from CLI to database
async function cliSaveCommit(req, res) {
  const { repositoryId, commitId, message, userId, files } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({ error: "Invalid Repository ID!" });
    }

    // Check if commit already exists
    const existingCommit = await Commit.findOne({ commitId });
    if (existingCommit) {
      return res.status(200).json({ message: "Commit already recorded" });
    }

    // Create commit record
    const newCommit = new Commit({
      commitId,
      repositoryId,
      message,
      author: userId,
      files: files || [],
      s3Path: `commits/${commitId}/`,
    });

    await newCommit.save();

    // Add commit to repository
    await Repository.findByIdAndUpdate(repositoryId, {
      $push: { commits: newCommit._id },
    });

    res.status(201).json({
      message: "Commit saved successfully",
      commitId: newCommit.commitId,
    });
  } catch (err) {
    console.error("Error saving commit:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Push files to S3 (called from CLI)
async function cliPushToS3(req, res) {
  const { commitId, files } = req.body; // files: [{filename, content}]

  try {
    const uploadPromises = files.map(async (file) => {
      const params = {
        Bucket: S3_BUCKET,
        Key: `commits/${commitId}/${file.filename}`,
        Body: Buffer.from(file.content, 'base64'),
      };

      return s3.upload(params).promise();
    });

    await Promise.all(uploadPromises);

    res.json({ message: "Files pushed to S3 successfully" });
  } catch (err) {
    console.error("Error pushing to S3:", err.message);
    res.status(500).json({ error: "Failed to push to S3" });
  }
}

// Pull files from S3 (called from CLI)
async function cliPullFromS3(req, res) {
  const { commitId } = req.query;

  try {
    const params = {
      Bucket: S3_BUCKET,
      Prefix: `commits/${commitId}/`,
    };

    const data = await s3.listObjectsV2(params).promise();
    const files = [];

    for (const object of data.Contents) {
      const fileParams = {
        Bucket: S3_BUCKET,
        Key: object.Key,
      };

      const fileData = await s3.getObject(fileParams).promise();
      files.push({
        filename: object.Key.split('/').pop(),
        content: fileData.Body.toString('base64'),
      });
    }

    res.json({ files });
  } catch (err) {
    console.error("Error pulling from S3:", err.message);
    res.status(500).json({ error: "Failed to pull from S3" });
  }
}

// Get commits for a repository (for website display)
async function getRepositoryCommits(req, res) {
  const { repoId } = req.params;

  try {
    const commits = await Commit.find({ repositoryId: repoId })
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    res.json({ commits });
  } catch (err) {
    console.error("Error fetching commits:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Get specific commit details
async function getCommitDetails(req, res) {
  const { commitId } = req.params;

  try {
    const commit = await Commit.findOne({ commitId })
      .populate("author", "username email")
      .populate("repositoryId", "name");

    if (!commit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    // Get files from S3
    const params = {
      Bucket: S3_BUCKET,
      Prefix: commit.s3Path,
    };

    const data = await s3.listObjectsV2(params).promise();
    const files = [];

    for (const object of data.Contents) {
      if (object.Key.endsWith('/')) continue; // Skip directories

      const fileParams = {
        Bucket: S3_BUCKET,
        Key: object.Key,
      };

      const fileData = await s3.getObject(fileParams).promise();
      files.push({
        filename: object.Key.split('/').pop(),
        content: fileData.Body.toString('utf-8'),
        size: object.Size,
      });
    }

    res.json({
      commit,
      files,
    });
  } catch (err) {
    console.error("Error fetching commit details:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  cliInitRepo,
  cliSaveCommit,
  cliPushToS3,
  cliPullFromS3,
  getRepositoryCommits,
  getCommitDetails,
};
