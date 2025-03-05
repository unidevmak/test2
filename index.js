const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const userInput = req.query.input;
  
  // Safe way to parse input instead of eval
  const result = Number(userInput) + 2; 
  
  res.send(`Result is: ${result}`);
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app; // Export for testing
