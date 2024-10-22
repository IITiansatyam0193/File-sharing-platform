const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Router } = require("express");
const fileController = require("../controllers/fileController");
const { requireAuth , checkUser } = require("../middlewares/authMiddleware");

const router = Router();

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.userId;

    const userFolderPath = path.join('uploads', userId.toString());  // Create a folder based on user ID

    fs.mkdirSync(userFolderPath, { recursive: true });               // Create the user folder if it doesn't exist
    
    cb(null, userFolderPath);
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }

});

// Create the Multer instance
const upload = multer({ storage: storage });

//UPLOAD
router.get("/upload" , requireAuth , fileController.upload_get);
router.post("/upload" , requireAuth , checkUser , upload.single('file') , fileController.upload_post);
router.get("/myuploads" , requireAuth , checkUser , fileController.myUploads_get);
router.get("/download", checkUser , fileController.download_get);
router.get("/rename" , checkUser , fileController.rename_get);

//SHAREING FEATURES
router.post("/share/:fileId", fileController.share_post);
router.get("/shared" , requireAuth , checkUser, fileController.shared_get);
router.get("/sharedbyme" , requireAuth , checkUser , fileController.sharedByMe_get);
router.put("/remove-share" , checkUser , fileController.remove_put);

//SHARABLE LINK
router.post("/shareLink/:fileId" , checkUser , fileController.shareLink_post);
router.get("/download/:token" , fileController.downloadToken_get);
router.post("/disable-shareLink/:fileId" , checkUser , fileController.disableShareLink_post);
router.get("/ActiveLinks" , checkUser , fileController.activeLinks_get);

//RECYCLE BIN
router.get("/delete" , checkUser , fileController.delete_get);
router.put("/restore" , checkUser , fileController.restore_put);
router.get("/recycleBin" , checkUser , fileController.recycleBin_get);
router.get("/permanentDelete" , checkUser , fileController.permanentDelete_get);

module.exports = router;