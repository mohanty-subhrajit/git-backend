const fs = require("fs").promises;
const path = require("path");
const { v4: uuid4 } = require("uuid");

async function commitRepo(message) {
  const repoPath = path.resolve(process.cwd(), ".Lapit");
  const stagedPath = path.join(repoPath, "staging");
  const commitPath = path.join(repoPath, "commits");

  try {
    await fs.mkdir(commitPath, { recursive: true });

    const commitId = uuid4();
    const commitDir = path.join(commitPath, commitId);
    await fs.mkdir(commitDir);

    const files = await fs.readdir(stagedPath);

    for (const file of files) {
      await fs.copyFile(
        path.join(stagedPath, file),
        path.join(commitDir, file)
      );
    }

    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify(
        {
          message,
          date: new Date().toISOString(),
        },
      )
    );

    console.log(`Commit ${commitId} created with message: "${message}"`);
  } catch (err) {
    console.error("Error committing files:", err.message);
  }
}

module.exports = { commitRepo };
