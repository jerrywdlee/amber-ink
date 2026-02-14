const express = require('express');
const cors = require('cors');
const functions = require('./index');

const app = express();
app.use(express.json());

// Apply CORS globally or per-route as needed. 
// Note: index.js already has CORS logic inside some functions, 
// but for Cloud Run/Express, we'll handle it here as well for safety.
app.use(cors({ origin: true }));

// Health Check
app.get('/', (req, res) => res.send('Amber Ink Backend is running on Cloud Run!'));

// Route Mapping (Mapping endpoints to our exported functions)
app.post('/onboardingAgent', (req, res) => functions.onboardingAgent(req, res));
app.post('/registerUser', (req, res) => functions.registerUser(req, res));
app.get('/checkIn', (req, res) => functions.checkIn(req, res));
app.post('/checkIn', (req, res) => functions.checkIn(req, res));
app.get('/getUserData', (req, res) => functions.getUserData(req, res));
app.post('/companionAgent', (req, res) => functions.companionAgent(req, res));
app.post('/runAiAnalyzer', (req, res) => functions.runAiAnalyzer(req, res));
app.post('/runDeliveryEngine', (req, res) => functions.runDeliveryEngine(req, res));
app.post('/runCompanionAgent', (req, res) => functions.runCompanionAgent(req, res));
app.get('/downloadMemorial', (req, res) => functions.downloadMemorial(req, res));
app.post('/emergencyMonitor', (req, res) => functions.emergencyMonitor(req, res));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
