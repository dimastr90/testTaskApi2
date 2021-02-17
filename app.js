const upload = require("./service/upload");
const express = require('express');
const config = require('config');
const cors = require('cors');

const PORT = config.get('port') || 5000;
const app = express();
app.use(cors());


app.post('/upload/:filename', async (req, res) => {
    try {
        const allowedContentTypes = config.get('allowedContentTypes');
        const allowedFileTypes = config.get('allowedFileTypes');
        const [, fileExtension] = (/\.([a-z]+$)/g).exec(req.params.filename);

        if (!allowedContentTypes.includes(req.headers['content-type']) || !allowedFileTypes.includes(fileExtension)) { //check, if file allowed
            res.status(400).json({message: "This file type is not supported"});
        } else {
            await upload.handleStream(req);
            res.status(200).json({message: 'ok'});
        }
    } catch (e) {
        console.warn(e.message)
    }
});

app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
});