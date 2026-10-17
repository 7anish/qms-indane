const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { clientUrl, nodeEnv } = require('./config/env');
const { UPLOAD_ROOT } = require('./config/upload');
const routes = require('./routes');
const { protect } = require('./middlewares/auth.middleware');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (nodeEnv !== 'test') app.use(morgan('dev'));

// Uploaded documents (GST/PAN/MSME) are sensitive, so only logged-in admins can fetch them.
// Browsers send the httpOnly `token` cookie set at login, so <img>/<a> links work.
app.use('/uploads', protect, express.static(UPLOAD_ROOT, { index: false, dotfiles: 'deny' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
