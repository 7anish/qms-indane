const { port, nodeEnv } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { verifyMailConfig } = require('./services/mail.service');

const start = async () => {
  await connectDB();
  const server = app.listen(port, () => {
    console.log(`QMS API running in ${nodeEnv} mode on http://localhost:${port}`);
  });
  verifyMailConfig();

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    server.close(() => process.exit(1));
  });
};

start();
