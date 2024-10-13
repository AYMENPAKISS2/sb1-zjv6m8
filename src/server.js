import express from 'express';
import cors from 'cors';
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Define Instance Schema
const InstanceSchema = new mongoose.Schema({
  instanceId: String,
  connectedPhones: [String]
});

const Instance = mongoose.model('Instance', InstanceSchema);

const instances = new Map();

async function createInstance(instanceId) {
  const client = new Client();
  let qr = '';
  let connectedPhones = [];

  client.on('qr', (qrCode) => {
    qr = qrCode;
    console.log(`QR RECEIVED for instance ${instanceId}`, qrCode);
  });

  client.on('ready', () => {
    console.log(`Client is ready for instance ${instanceId}!`);
  });

  client.on('authenticated', async (session) => {
    console.log(`Client authenticated for instance ${instanceId}`);
    if (connectedPhones.length < 5) {
      connectedPhones.push(session.me.user);
      await Instance.findOneAndUpdate(
        { instanceId },
        { $addToSet: { connectedPhones: session.me.user } },
        { upsert: true }
      );
    }
  });

  client.initialize();

  // Load connected phones from database
  const existingInstance = await Instance.findOne({ instanceId });
  if (existingInstance) {
    connectedPhones = existingInstance.connectedPhones;
  }

  return { client, qr, connectedPhones };
}

app.post('/create-instance', async (req, res) => {
  const { instanceId } = req.body;
  if (instances.has(instanceId)) {
    res.status(400).json({ error: 'Instance already exists' });
  } else {
    const instance = await createInstance(instanceId);
    instances.set(instanceId, instance);
    res.json({ message: 'Instance created successfully' });
  }
});

app.get('/instances', async (req, res) => {
  const instanceList = await Instance.find({}, 'instanceId');
  res.json(instanceList.map(instance => instance.instanceId));
});

app.get('/instance/:id/qr', (req, res) => {
  const instanceId = req.params.id;
  const instance = instances.get(instanceId);
  if (instance && instance.qr) {
    qrcode.toDataURL(instance.qr, (err, url) => {
      if (err) {
        res.status(500).json({ error: 'Error generating QR code' });
      } else {
        res.json({ qr: url });
      }
    });
  } else {
    res.status(404).json({ error: 'QR code not available or instance not found' });
  }
});

app.get('/instance/:id/phones', async (req, res) => {
  const instanceId = req.params.id;
  const instance = await Instance.findOne({ instanceId });
  if (instance) {
    res.json({ phones: instance.connectedPhones });
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});