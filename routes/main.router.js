const express = require("express");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const issueRouter = require("./issue.router");
const cliRouter = require("./cli.router");
const browseRouter = require("./browse.router");
const mainRouter = express.Router();

mainRouter.get("/", (req, res) => {
  res.send("welcome to server");
});

mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(cliRouter);
mainRouter.use(browseRouter);

module.exports = mainRouter;