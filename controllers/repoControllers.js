const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/usermodel");
const Issue = require("../models/issueModel");
const Commit = require("../models/commitModel");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function createRepository(req, res) {
  const { owner, name, issues, content, description, visibility } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: "Repository name is required!" });
    }

    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ error: "Invalid User ID!" });
    }

    const newRepository = new Repository({
      name,
      description,
      visibility,
      owner,
      content,
      issues,
    });

    const result = await newRepository.save();

    res.status(201).json({
      message: "Repository created!",
      repositoryID: result._id,
    });
  } catch (err) {
    console.error("Error during repository creation : ", err.message);
    res.status(500).send("Server error");
  }
}

async function getAllRepositories(req, res) {
  try {
    const repositories = await Repository.find({})
      .populate("owner")
      .populate("issues");

    res.json(repositories);
  } catch (err) {
    console.error("Error during fetching repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoryById(req, res) {
  const repoID = req.params.id;
  try {
    const repository = await Repository.findById(repoID) 
      .populate("owner")
      .populate("issues");

    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoryByName(req, res) {
  const { name } = req.params;
  try {
    const repository = await Repository.find({ name })
      .populate("owner")
      .populate("issues");

    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoriesForCurrentUser(req, res) {
  console.log(req.params);
  const { userID } = req.params;

  try {
    const repositories = await Repository.find({ owner: userID });

    if (!repositories || repositories.length == 0) {
      return res.status(404).json({ error: "User Repositories not found!" });
    }
    console.log(repositories);
    res.json({ message: "Repositories found!", repositories });
  } catch (err) {
    console.error("Error during fetching user repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

async function updateRepositoryById(req, res) {
  const { id } = req.params;
  const { content, description } = req.body;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    repository.content.push(content);
    repository.description = description;

    const updatedRepository = await repository.save();

    res.json({
      message: "Repository updated successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during updating repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function toggleVisibilityById(req, res) {
  const { id } = req.params;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    repository.visibility = !repository.visibility;

    const updatedRepository = await repository.save();

    res.json({
      message: "Repository visibility toggled successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during toggling visibility : ", err.message);
    res.status(500).send("Server error");
  }
}

async function deleteRepositoryById(req, res) {
  const { id } = req.params;
  try {
    // Find repository first
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    // Find all commits for this repository
    const commits = await Commit.find({ repositoryId: id });
    
    // Delete all files from S3 for each commit
    const deletePromises = [];
    for (const commit of commits) {
      if (commit.s3Path) {
        // Delete all files in the commit folder
        const listParams = {
          Bucket: S3_BUCKET,
          Prefix: commit.s3Path,
        };
        
        try {
          const listedObjects = await s3.listObjectsV2(listParams).promise();
          
          if (listedObjects.Contents.length > 0) {
            const deleteParams = {
              Bucket: S3_BUCKET,
              Delete: {
                Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
              },
            };
            deletePromises.push(s3.deleteObjects(deleteParams).promise());
          }
        } catch (s3Error) {
          console.error(`Error deleting S3 files for commit ${commit.commitId}:`, s3Error.message);
        }
      }
    }
    
    // Wait for all S3 deletions to complete
    await Promise.all(deletePromises);
    
    // Delete all commits for this repository
    await Commit.deleteMany({ repositoryId: id });
    
    // Delete all issues for this repository
    await Issue.deleteMany({ repository: id });
    
    // Remove repository from starred lists
    await User.updateMany(
      { starred: id },
      { $pull: { starred: id } }
    );
    
    // Finally, delete the repository
    await Repository.findByIdAndDelete(id);

    res.json({ 
      message: "Repository and all associated data deleted successfully!",
      deletedCommits: commits.length,
    });
  } catch (err) {
    console.error("Error during deleting repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function searchPublicRepositories(req, res) {
  const { query } = req.query;
  
  try {
    if (!query) {
      return res.status(400).json({ error: "Search query is required!" });
    }

    const repositories = await Repository.find({
      visibility: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate("owner", "username email").limit(20);

    res.json(repositories);
  } catch (err) {
    console.error("Error during searching repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

module.exports = {
  createRepository,
  getAllRepositories,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  searchPublicRepositories,
};