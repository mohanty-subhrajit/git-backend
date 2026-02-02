const { s3, S3_BUCKET } = require("../config/aws-config");
const Repository = require("../models/repoModel");
const Commit = require("../models/commitModel");

// Get repository details with latest commit (public access)
async function getPublicRepository(req, res) {
  const { repoId } = req.params;

  try {
    const repository = await Repository.findById(repoId)
      .populate("owner", "username email")
      .populate({
        path: "commits",
        options: { sort: { createdAt: -1 }, limit: 1 },
        populate: { path: "author", select: "username" }
      });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Only allow public repositories to be viewed without auth
    if (!repository.visibility) {
      return res.status(403).json({ error: "This repository is private" });
    }

    res.json(repository);
  } catch (err) {
    console.error("Error fetching repository:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Browse repository files from latest commit (public access)
async function browseRepositoryFiles(req, res) {
  const { repoId } = req.params;

  try {
    const repository = await Repository.findById(repoId).populate({
      path: "commits",
      options: { sort: { createdAt: -1 }, limit: 1 }
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (!repository.visibility) {
      return res.status(403).json({ error: "This repository is private" });
    }

    if (!repository.commits || repository.commits.length === 0) {
      return res.json({ files: [], message: "No commits yet" });
    }

    const latestCommit = repository.commits[0];

    // List all files in the latest commit
    const params = {
      Bucket: S3_BUCKET,
      Prefix: `commits/${latestCommit.commitId}/`,
    };

    const data = await s3.listObjectsV2(params).promise();
    
    const files = data.Contents
      .filter(obj => !obj.Key.endsWith('/'))
      .map(obj => ({
        filename: obj.Key.split('/').pop(),
        path: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      }));

    res.json({
      commitId: latestCommit.commitId,
      commitMessage: latestCommit.message,
      files,
    });
  } catch (err) {
    console.error("Error browsing files:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Get specific file content (public access)
async function getFileContent(req, res) {
  const { repoId, filename } = req.params;

  try {
    const repository = await Repository.findById(repoId).populate({
      path: "commits",
      options: { sort: { createdAt: -1 }, limit: 1 }
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (!repository.visibility) {
      return res.status(403).json({ error: "This repository is private" });
    }

    if (!repository.commits || repository.commits.length === 0) {
      return res.status(404).json({ error: "No files available" });
    }

    const latestCommit = repository.commits[0];
    const fileKey = `commits/${latestCommit.commitId}/${filename}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: fileKey,
    };

    const fileData = await s3.getObject(params).promise();

    res.json({
      filename,
      content: fileData.Body.toString('utf-8'),
      size: fileData.ContentLength,
      contentType: fileData.ContentType,
    });
  } catch (err) {
    if (err.code === 'NoSuchKey') {
      return res.status(404).json({ error: "File not found" });
    }
    console.error("Error fetching file:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

// Get README content if available
async function getReadme(req, res) {
  const { repoId } = req.params;

  try {
    const repository = await Repository.findById(repoId).populate({
      path: "commits",
      options: { sort: { createdAt: -1 }, limit: 1 }
    });

    if (!repository || !repository.visibility) {
      return res.status(404).json({ error: "Repository not found or private" });
    }

    if (!repository.commits || repository.commits.length === 0) {
      return res.json({ readme: null });
    }

    const latestCommit = repository.commits[0];
    const readmeNames = ['README.md', 'README.txt', 'readme.md', 'Readme.md'];
    
    for (const readmeName of readmeNames) {
      try {
        const params = {
          Bucket: S3_BUCKET,
          Key: `commits/${latestCommit.commitId}/${readmeName}`,
        };

        const fileData = await s3.getObject(params).promise();
        return res.json({
          readme: fileData.Body.toString('utf-8'),
          filename: readmeName,
        });
      } catch (err) {
        continue; // Try next README variant
      }
    }

    res.json({ readme: null });
  } catch (err) {
    console.error("Error fetching README:", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getPublicRepository,
  browseRepositoryFiles,
  getFileContent,
  getReadme,
};
