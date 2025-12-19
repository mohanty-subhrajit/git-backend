const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

async function createIssue(req, res) {
  const { title, description, labels } = req.body;
  const { id } = req.params;
  const creatorId = req.user.id;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    const issue = new Issue({
      title,
      description,
      repository: id,
      creator: creatorId,
      labels: labels || [],
    });

    await issue.save();

    // Add issue to repository
    repository.issues.push(issue._id);
    await repository.save();

    const populatedIssue = await Issue.findById(issue._id)
      .populate("creator", "username email")
      .populate("assignee", "username email");

    res.status(201).json(populatedIssue);
  } catch (err) {
    console.error("Error during issue creation : ", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

async function updateIssueById(req, res) {
  const { id } = req.params;
  const { title, description, status, assignee, labels } = req.body;
  
  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }

    if (title) issue.title = title;
    if (description) issue.description = description;
    if (status) issue.status = status;
    if (assignee) issue.assignee = assignee;
    if (labels) issue.labels = labels;

    await issue.save();

    const populatedIssue = await Issue.findById(issue._id)
      .populate("creator", "username email")
      .populate("assignee", "username email");

    res.json({ message: "Issue updated", issue: populatedIssue });
  } catch (err) {
    console.error("Error during issue updation : ", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

async function deleteIssueById(req, res) {
  const { id } = req.params;

  try {
    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }
    res.json({ message: "Issue deleted" });
  } catch (err) {
    console.error("Error during issue deletion : ", err.message);
    res.status(500).send("Server error");
  }
}

async function getAllIssues(req, res) {
  const { repoId } = req.params;

  try {
    const issues = await Issue.find({ repository: repoId })
      .populate("creator", "username email")
      .populate("assignee", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(issues);
  } catch (err) {
    console.error("Error during issue fetching : ", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

async function getIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findById(id)
      .populate("creator", "username email")
      .populate("assignee", "username email")
      .populate("repository", "name description");

    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }

    res.json(issue);
  } catch (err) {
    console.error("Error during issue fetching : ", err.message);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById,
};