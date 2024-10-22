const path = require("path");
const fs = require("fs");
const File = require("../models/file.model.js");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user.model.js");

module.exports.upload_get = (req, res) => {
  res.render("upload");
};

module.exports.upload_post = async (req, res) => {
  try {
    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      userId: req.userId,
      token: uuidv4(),
    });
    await file.save();
    res.redirect("/myuploads");
  } catch (error) {
    console.error("Error uploading file", error);
    res.status(500).send("Error uploading file");
  }
};

// my uploads rendering page
module.exports.myUploads_get = async (req, res) => {
  const userFiles = await File.find({ userId: req.userId, deletedAt: null });
  res.render("myuploads", { userFiles });
};

//  download route only able to download if its owner or it is shared with
module.exports.download_get = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.query.fileId });
    const userId = req.query.userId;
    if (!file) {
      return res.status(404).send("File not found");
    }
    const Permission = ((String(req.userId)===String(file.userId))||(file.shared===true && file.sharedWith.includes(userId)));
    // Use the Permission variable to check if the user is authorized
    if (!Permission) {
      return res.status(403).send("You do not have permission to access this file");
    }
    const filePath = path.join(file.filePath);
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error("Error downloading file", error);
    res.status(500).send("Error downloading file");
  }
};

//  rename route
module.exports.rename_get = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.query.fileId, userId: req.userId },
      { originalName: req.query.newName }
    );
    if (!file) {
      return res.status(404).send("File not Found");
    }
    res.redirect("/myuploads");
  } catch (error) {
    console.error("Error renaming file", error);
    res.status(500).send("Error renaming file");
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////

// POST route to add users to the sharedWith array
module.exports.share_post = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { userEmails } = req.body;

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).send("File not found");
    }

    const users = await User.find({ email: { $in: userEmails } });

    if (!users || users.length === 0) {
      return res
        .status(404)
        .send("No users found with the provided email addresses");
    }

    // Add the user IDs to the sharedWith array
    file.sharedWith.push(...users.map((user) => user._id));
    file.shared = true;
    await file.save();

    res.send("Users added to the sharedWith array successfully");
  } catch (error) {
    console.error("Error sharing file:", error);
    res.status(500).send("Error sharing file");
  }
};

// shared get route shows the files shared with user

module.exports.shared_get = async (req, res) => {
  try {
    const sharedFiles = await File.find({ sharedWith: req.userId }).populate(
      "userId"
    );

    res.render("shared", { sharedFiles });
  } catch (error) {
    console.error("Error:".error);
    res.status(500).send("error in rendering shared Files");
  }
};

module.exports.sharedByMe_get = async (req, res) => {
  try {
    const sharedFiles = await File.find({ userId: req.userId, shared: true });
    res.render("sharedbyme", { sharedFiles });
  } catch (error) {
    console.error("Error rendering owner shared files", error);
    res.status(500).send("Error rendering owner shared files");
  }
};

module.exports.remove_put = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    const userId = req.userId;

    const file = await File.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).send("File not found");
    }

    //  finding index on which the user Id is stored
    const sharedWithIndex = file.sharedWith.indexOf(userId);

    if (sharedWithIndex === -1) {
      return res.status(400).send("User ID not found in sharedWith array");
    }

    file.sharedWith.splice(sharedWithIndex, 1);
    await file.save();

    res.send("User removed");
  } catch (error) {
    console.error("Error removing user", error);
    res.status(500).send("Error removing user");
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.shareLink_post = async (req, res) => {
  try {
    const fileId = req.params.fileId;

    const file = await File.findOne({ _id: fileId, userId: req.userId });

    if (!file) {
      return res.status(404).send("File not found");
    }

    file.sharedLinkActive = true;
    await file.save();

    const shareLink = `${req.protocol}://${req.get("host")}/download/${file.token}`;

    res.send(shareLink);
  } catch (error) {
    console.error("Error sharing file", error);
    res.status(500).send("Error sharing file");
  }
};

module.exports.downloadToken_get = async (req, res) => {
  try {
    const token = req.params.token;
    const file = await File.findOne({ token });

    if (!file) {
      return res.status(404).send("File not found");
    }

    const filePath = path.join(file.filePath);

    res.download(filePath, file.originalName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading file");
      }
    });
  } catch (error) {
    console.error("Error accessing shared file", error);
    res.status(500).send("Error accessing shared file");
  }
};

module.exports.disableShareLink_post = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const file = await File.findOne({ _id: fileId, userId: req.userId });

    if (!file) {
      return res.status(404).send("File not found");
    }

    file.sharedLinkActive = false;
    file.token = uuidv4();
    await file.save();

    res.send("Sharable link disabled");
  } catch (error) {
    console.error("Error disabling sharable link", error);
    res.status(500).send("Error disabling sharable link");
  }
};

// get Active Links
module.exports.activeLinks_get = async (req, res) => {
  try {
    const files = await File.find({
      userId: req.userId,
      sharedLinkActive: true,
    });
    const activeLinks = files.map((file) => {
      return {
        fileName: file.originalName,
        link: `${req.protocol}://${req.get("host")}/download/${file.token}`,
        fileId: file._id,
      };
    });

    res.render("ActiveLinks", { activeLinks });
  } catch (error) {
    console.error("Error fetching active links:", error);
    res.status(500).send("Error fetching active links");
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.delete_get = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.query.fileId }).populate(
      "userId"
    );

    if (!file) {
      return res.status(404).send("File not found");
    }

    // Check if the requesting user is the owner of the file
    if (file.userId._id.toString() !== req.userId.toString()) {
      return res
        .status(403)
        .send("You do not have permission to delete this file");
    }

    file.deletedAt = new Date();
    file.shared = false;
    file.sharedWith.splice(0, file.sharedWith.length);
    file.sharedLinkActive = false;
    await file.save();

    res.send("File moved to recycle bin");
  } catch (error) {
    console.error("Error moving file to recycle bin", error);
    res.status(500).send("Error moving file to recycle bin");
  }
};

module.exports.restore_put = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    const file = await File.findOne({ _id: fileId, userId: req.userId });

    if (!file) {
      return res.status(404).send("File not found");
    }

    if (!file.deletedAt) {
      return res.status(400).send("File is not in the recycle bin");
    }

    // Set the deletedAt field to null
    file.deletedAt = null;
    await file.save();

    res.send("File restored from recycle bin");
  } catch (error) {
    console.error("Error restoring file from recycle bin", error);
    res.status(500).send("Error restoring file from recycle bin");
  }
};

// show the files in the recycle bin
module.exports.recycleBin_get = async (req, res) => {
  try {
    const deletedFiles = await File.find({
      userId: req.userId,
      deletedAt: { $ne: null },
    });

    res.render("recyclebin", { deletedFiles });
  } catch (error) {
    console.error("Error in loading recycle bin", error);
    res.status(500).send("Error in loading recycle bin");
  }
};

module.exports.permanentDelete_get = async (req, res) => {
  try {
    const fileId = req.query.fileId;
    const file = await File.findOne({ _id: fileId });

    if (!file) {
      return res.status(404).send("File not found");
    }

    // Check if the requesting user is the owner of the file
    if (file.userId._id.toString() !== req.userId.toString()) {
      return res
        .status(403)
        .send("You do not have permission to delete this file");
    }

    const filePath = path.join(file.filePath);
    fs.unlinkSync(filePath);

    await File.deleteOne({ _id: fileId });

    res.send("File deleted permanently");
  } catch (error) {
    console.error("Error Permanently deleting file", error);
    res.status(500).send("Error Permanently deleting file");
  }
};

// Scheduled task to delete files from the recycle bin
const deleteExpiredFiles = async () => {
  const thirtyDaysAgo = new Date();

  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // find all files with deletedAt value older than thirtyDaysAgo
  const file = await File.find({ deletedAt: { $lt: thirtyDaysAgo } });

  // Delete the file from the filesystem
  for (const i = 0; i < file.length; i++) {
    const filePath = path.join(file[i].filePath);
    fs.unlinkSync(filePath);
  }

  // Find and delete files with deletedAt value older than thirtyDaysAgo
  await File.deleteMany({ deletedAt: { $lt: thirtyDaysAgo } });
};

// Schedule the task to run once every day
setInterval(deleteExpiredFiles, 24 * 60 * 60 * 1000);
