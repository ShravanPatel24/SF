const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images"); // Ensure the `public/images` directory exists
  },
  filename: function (req, file, cb) {
    let fileExtension = "";
    if (file.originalname.split(".").length > 1) {
      fileExtension = file.originalname.substring(
        file.originalname.lastIndexOf(".")
      );
    }
    const filenameWithoutExtension = file.originalname
      .toLowerCase()
      .split(" ")
      .join("-")
      ?.split(".")[0];
    cb(
      null,
      filenameWithoutExtension +
        Date.now() +
        Math.ceil(Math.random() * 1e5) + // avoid rare name conflict
        fileExtension
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1 * 1000 * 1000, // Limit file size to 1MB
  },
});

module.exports = { upload };