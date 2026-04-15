const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Web app running at http://localhost:${port}`);
});
