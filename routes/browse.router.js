const express = require("express");
const browseController = require("../controllers/browseController");

const browseRouter = express.Router();

// Public repository browsing routes (no authentication required for public repos)
browseRouter.get("/browse/:repoId", browseController.getPublicRepository);
browseRouter.get("/browse/:repoId/files", browseController.browseRepositoryFiles);
browseRouter.get("/browse/:repoId/file/:filename", browseController.getFileContent);
browseRouter.get("/browse/:repoId/readme", browseController.getReadme);

module.exports = browseRouter;
