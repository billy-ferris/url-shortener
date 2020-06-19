const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const { nanoid } = require('nanoid');

require('dotenv').config();

const db = monk(process.env.MONGODB_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express();

app.use(helmet());
app.use(morgan('common'));
app.use(express.json());

app.get('/', (req, res, next) => {
  res.json({ message: 'URL Shortener' });
});

app.get('/:id', async (req, res, next) => {
  const { id: slug } = req.params;

  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.redirect(url.url);
    }
    return res.status(404).json({ message: `${url} not found` });
  } catch (error) {
    return res.status(404).json({ message: `${url} not found` });
  }
});

const schema = yup.object().shape({
  url: yup.string().trim().url().required(),
  slug: yup
    .string()
    .trim()
    .matches(/^[\w\-]+$/i),
});

app.post('/api/url', async (req, res, next) => {
  let { slug, url } = req.body;
  try {
    await schema.validate({
      url,
      slug,
    });
    if (!slug) {
      slug = nanoid(5);
    }
    const isExistingUrl = await urls.findOne({ slug });
    if (isExistingUrl) {
      throw new Error('Slug in use.');
    }
    slug = slug.toLowerCase();
    const newUrl = {
      url,
      slug,
    };
    const createdUrl = await urls.insert(newUrl);
    res.status(201).json(createdUrl);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? null : error.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
