import { RawAuthor } from './raw-author';

export type RawArticle = {
  authors: Array<RawAuthor>;
  pubmed_id: string;
  mesh_date: string;
};
