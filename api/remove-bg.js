import { IncomingForm } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable Error:', err);
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    // formidable v3 structure: files.image_file is an array
    const file = Array.isArray(files.image_file) ? files.image_file[0] : files.image_file;
    
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      const apiKey = process.env.REMOVE_BG_API_KEY;
      if (!apiKey) {
        console.error('API Key missing in Vercel environment');
        return res.status(500).json({ error: 'Server configuration error: API Key missing' });
      }

      const fileData = fs.readFileSync(file.filepath);

      const formData = new FormData();
      formData.append('image_file', fileData, {
        filename: file.originalFilename || 'image.png',
        contentType: file.mimetype || 'image/png',
      });
      formData.append('size', 'auto');

      console.log('Forwarding to Remove.bg...');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Api-Key': apiKey,
        },
        responseType: 'arraybuffer',
      });

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(response.data);

    } catch (error) {
      console.error('Proxy Error:', error.message);
      if (error.response) {
         try {
           // Attempt to parse binary error response
           const errorText = Buffer.from(error.response.data).toString('utf8');
           console.error('External API Error:', errorText);
           const errorJson = JSON.parse(errorText);
           return res.status(error.response.status).json(errorJson);
         } catch (e) {
           return res.status(error.response.status || 500).json({ error: 'External API Error' });
         }
      }
      res.status(500).json({ error: 'Failed to process image' });
    }
  });
}
