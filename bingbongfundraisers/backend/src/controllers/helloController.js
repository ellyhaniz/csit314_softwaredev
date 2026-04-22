let clickCount = 0;

const getHello = (req, res) => {
  res.json({
    message: 'Hello World',
    count: clickCount,
  });
};

const incrementHelloCount = (req, res) => {
  clickCount += 1;
  res.json({
    message: 'Hello World',
    count: clickCount,
  });
};

module.exports = {
  getHello,
  incrementHelloCount,
};
