const express = require("express");
const repoController = require("../controllers/repoControllers");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRepoOwner } = require("../middleware/authorizeMiddleware");
const { repoCreationLimiter } = require("../middleware/rateLimiter");

const repoRouter = express.Router();

repoRouter.post("/repo/create", authenticate, repoCreationLimiter, repoController.createRepository);
repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/search", repoController.searchPublicRepositories);
repoRouter.get("/repo/:id", repoController.fetchRepositoryById);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", authenticate, repoController.fetchRepositoriesForCurrentUser);
repoRouter.put("/repo/update/:id", authenticate, authorizeRepoOwner, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authenticate, authorizeRepoOwner, repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", authenticate, authorizeRepoOwner, repoController.toggleVisibilityById);

module.exports = repoRouter;