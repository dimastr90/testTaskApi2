const fs = require('fs');
const fsPromises = require('fs').promises;
const sizeOf = require('image-size');
const config = require('config');
const resizeImg = require('resize-img');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const tempPath = config.get('fileTempPath'); //directory for temporary files

const checkAndPrepareImage = requestStream => {
    const fileNameAndExtension = requestStream.params.filename;

    const upload = new Promise((resolve, reject) => {  //upload image to temporary directory
        const writeStream = fs.createWriteStream(tempPath + fileNameAndExtension);
        requestStream.on('error', (e) => reject(e.message))
            .on('end', () => resolve('success'))
            .pipe(writeStream)
            .on('error', (e) => reject(e.message))
    });

    upload
        .then(async () => {
            await calculateSizeAndResize(fileNameAndExtension);
            await sendFileToAWS(fs.createReadStream(tempPath + fileNameAndExtension), fileNameAndExtension);
            await fsPromises.unlink(tempPath + fileNameAndExtension);
        })
        .catch(error => {
            throw error;
        })
};


// check the size of the image and resize it if necessary
const calculateSizeAndResize = async filename => {
    try {
        const maxWidth = config.get('imageMaxWidth');
        const maxHeight = config.get('imageMaxHeight');
        const dimensions = await sizeOf(tempPath + filename);

        if (dimensions.height > maxHeight || dimensions.width > maxWidth) {
            const newHeight = Math.min(dimensions.height, maxHeight);
            const newWidth = Math.min(dimensions.width, maxWidth);
            const originalImage = await fsPromises.readFile(tempPath + filename);
            const newImage = await resizeImg(originalImage, {
                width: newWidth,
                height: newHeight
            });
            await fsPromises.writeFile(tempPath + filename, newImage);
        }
    } catch (e) {
        console.warn(e.message);
    }
};


//sending file to our bucket
const sendFileToAWS = async (stream, filename) => {
    const params = {
        Bucket: 'samplebucketfortesttask',
        Key: filename,
        Body: stream
    };

    await s3.upload(params).promise();
};

// if our file is an image we transfer it to check and resize. If the file is not an image, send it directly to aws;
const handleStream = stream => {
    if (stream.headers['content-type'].startsWith("image/")) {
        checkAndPrepareImage(stream);
    } else {
        sendFileToAWS(stream, stream.params.filename);
    }
};


module.exports.handleStream = handleStream;