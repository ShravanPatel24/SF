const multer = require('multer');
const path = require('path');
 
// Set up storage destination and filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profilePictures'); // Define where to save files
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Unique filename
        cb(null, file.fieldname + '-' + uniqueSuffix + ext); // Save with unique name
    }
});
 
// Configure multer with the defined storage
const upload = multer({ storage });
 
module.exports = upload;
 
 