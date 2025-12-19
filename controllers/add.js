const fs = require('fs').promises;
const path = require('path');

async function addRepo(filePath) {
  

    const repoPath = path.resolve(process.cwd(), ".Lapit"); // absolute file path
    const staggingpath = path.join(repoPath, "staging"); // joins the folder

    try {
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (err) {
            console.error(`Error: File '${filePath}' does not exist!`);
            return;
        }

        await fs.mkdir(staggingpath, { recursive: true }); // new folder creation
        const fileName = path.basename(filePath); // user given file
        await fs.copyFile(filePath, path.join(staggingpath, fileName)); // copying it to the existing file
        console.log(`File ${fileName} added to the staging area!`);
    } catch (err) {
        console.error("Error adding file:", err);
    }
}

module.exports = {addRepo}