const express = require("express");
const issueController = require("../controllers/issueController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeIssue } = require("../middleware/authorizeMiddleware");
const { issueCreationLimiter } = require("../middleware/rateLimiter");

const issueRouter = express.Router();

issueRouter.post("/issue/create/:id", authenticate, issueCreationLimiter, issueController.createIssue);
issueRouter.put("/issue/update/:id", authenticate, authorizeIssue, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authenticate, authorizeIssue, issueController.deleteIssueById);
issueRouter.get("/issue/repo/:repoId", authenticate, issueController.getAllIssues);
issueRouter.get("/issue/:id", authenticate, issueController.getIssueById);

module.exports = issueRouter;