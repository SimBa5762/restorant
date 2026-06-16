const path = require('path');
const fs = require('fs');

const DISHES_DIR = path.join(__dirname, '../public/images/dishes');

function deleteDishImage(imagePath) {
    if (!imagePath || !imagePath.includes('/images/dishes/')) return;

    const filename = path.basename(imagePath);
    const fullPath = path.join(DISHES_DIR, filename);

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
}

module.exports = { deleteDishImage, DISHES_DIR };
