CREATE VIRTUAL TABLE app_search USING fts5(
  app_id UNINDEXED,
  name,
  author,
  description,
  categories,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
