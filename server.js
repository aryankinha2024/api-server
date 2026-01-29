const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Moderator' },
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/users', (req, res) => {
  res.json({ 
    success: true, 
    message: 'All users fetched',
    data: users 
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (user) {
    res.json({ 
      success: true, 
      message: 'User found',
      data: user 
    });
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'User not found',
      data: null 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
