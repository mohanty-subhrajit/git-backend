const express = require("express");
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeUserProfile } = require("../middleware/authorizeMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const userRouter = express.Router();

userRouter.get("/allUsers", authenticate, userController.getAllUsers);
userRouter.post("/signup", authLimiter, userController.signup);
userRouter.post("/login", authLimiter, userController.login);
userRouter.get("/userProfile/:id", authenticate, userController.getUserProfile);
userRouter.put("/updateProfile/:id", authenticate, authorizeUserProfile, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authenticate, authorizeUserProfile, userController.deleteUserProfile);
userRouter.post("/star/:userId/:repoId", authenticate, userController.toggleStarRepo);
userRouter.get("/starred/:userId", authenticate, userController.getStarredRepos);
userRouter.post("/follow/:userId/:targetUserId", authenticate, userController.toggleFollowUser);
userRouter.get("/connections/:userId", authenticate, userController.getFollowersAndFollowing);

module.exports = userRouter;