// import dulu ya ges
const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {GoogleGenerativeAI} = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model: 'models/gemini-2.5-flash'});
const upload = multer({dest: 'uploads/'});

// generate text
app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({output: response.text()});
    }
    catch (error) {
        res.status[500].json({ error: error.message });
    }
});

// generate image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe this image';
    const image = imageToGenerativePart(req.file.path, req.file.mimetype);
    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({output: response.text()});
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

// generate document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filepath = req.file.path;
    const buffer = fs.readFileSync(filepath);
    const base64data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentPart = {
            inlineData: {data: base64data, mimeType},
        };

        const result = await model.generateContent(['Analyze this document:', documentPart]);
        const response = await result.response;
        res.json({output: response.text()});
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        fs.unlinkSync(filepath);
    }
});

// generate audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audio64buffer = fs.readFileSync(req.file.path);
    const base64audio = audio64buffer.toString('base64');
    const audioPart = {
        inlineData: {data: base64audio, mimeType: req.file.mimetype}
    };

    try {
        const result = await model.generateContent(['Transcribe or analyze the following audio', audioPart]);
        const response = await result.response;
        res.json({output: response.text()});
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

// Function to convert image to generative part
function imageToGenerativePart(imagePath, mimeType) {
    const imageBuffer = fs.readFileSync(imagePath);
    return {
        inlineData: {
            mimeType,
            data: imageBuffer.toString('base64')
        }
    };
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server Gemini API is running on port at http://localhost:${PORT}`);
});