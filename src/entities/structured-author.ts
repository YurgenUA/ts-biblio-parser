import { ObjectId } from 'mongodb';

export type StructuredAuthor = {
  _id?: ObjectId;
  name1: string;
  name2: string;
  email: string;
  articles?: Array<string>;
};
