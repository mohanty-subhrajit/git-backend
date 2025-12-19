const express = require("express");
const cliController = require("../controllers/cliController");
const { authenticate } = require("../middleware/authMiddleware");
const { cliLimiter } = require("../middleware/rateLimiter");

const cliRouter = express.Router();

// CLI specific routes with rate limiting
cliRouter.post("/cli/init", authenticate, cliLimiter, cliController.cliInitRepo);
cliRouter.post("/cli/commit", authenticate, cliLimiter, cliController.cliSaveCommit);
cliRouter.post("/cli/push", authenticate, cliLimiter, cliController.cliPushToS3);
cliRouter.get("/cli/pull", authenticate, cliLimiter, cliController.cliPullFromS3);

// Web routes for viewing commits
cliRouter.get("/repo/:repoId/commits", authenticate, cliController.getRepositoryCommits);
cliRouter.get("/commit/:commitId", authenticate, cliController.getCommitDetails);

module.exports = cliRouter;
