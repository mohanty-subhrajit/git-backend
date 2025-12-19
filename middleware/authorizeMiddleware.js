const Repository = require('../models/repoModel');
const mongoose = require('mongoose');

const authorizeRepoOwner = async (req, res, next) => {
  try {
    const repoId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ message: 'Invalid repository ID!' });
    }

    const repository = await Repository.findById(repoId);
    
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found!' });
    }

    if (repository.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied! You are not the owner of this repository.' });
    }

    next();
  } catch (err) {
    console.error('Authorization error:', err.message);
    return res.status(500).json({ message: 'Server error during authorization!' });
  }
};

const authorizeUserProfile = (req, res, next) => {
  try {
    const profileId = req.params.id;
    const userId = req.user.id;

    if (profileId !== userId) {
      return res.status(403).json({ message: 'Access denied! You can only modify your own profile.' });
    }

    next();
  } catch (err) {
    console.error('Authorization error:', err.message);
    return res.status(500).json({ message: 'Server error during authorization!' });
  }
};

const authorizeIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ message: 'Invalid issue ID!' });
    }

    const Issue = require('../models/issueModel');
    const issue = await Issue.findById(issueId).populate('repository');
    
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found!' });
    }

    // Check if user is the issue creator or repository owner
    const isCreator = issue.creator.toString() === userId;
    const isRepoOwner = issue.repository.owner.toString() === userId;

    if (!isCreator && !isRepoOwner) {
      return res.status(403).json({ message: 'Access denied! You can only modify your own issues or issues in your repositories.' });
    }

    next();
  } catch (err) {
    console.error('Authorization error:', err.message);
    return res.status(500).json({ message: 'Server error during authorization!' });
  }
};

module.exports = { authorizeRepoOwner, authorizeUserProfile, authorizeIssue };