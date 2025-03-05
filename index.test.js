const request = require('supertest');
const app = require('./index'); // Import your index.js

describe('GET /', () => {
  it('should return correct result for valid numeric input', async () => {
    const res = await request(app).get('/?input=3');
    expect(res.text).toBe('Result is: 5');
  });

  it('should return NaN for non-numeric input', async () => {
    const res = await request(app).get('/?input=abc');
    expect(res.text).toBe('Result is: NaN');
  });
});
