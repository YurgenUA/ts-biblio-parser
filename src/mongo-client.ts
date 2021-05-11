import { Db, MongoClient } from 'mongodb';

import { RawArticle } from './entities/raw-article';
import { StructuredAuthor } from './entities/structured-author';

const { MONGO_CONNECTION_STRING, DB_NAME } = process.env;

export const COLLECTIONS = {
  AUTHORS: 'authors',
  ARTICLES: 'pubmed_articles',
  STATS: '_stats',
};

export default class MongoDbClient {
  private client: MongoClient;

  async getClient(): Promise<MongoClient> {
    if (this.client) return this.client;
    try {
      this.client = await MongoClient.connect(MONGO_CONNECTION_STRING, {
        sslValidate: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      return this.client;
    } catch (e) {
      throw new Error(`Failed to connect to db [${e}]`);
    }
  }

  async getDb(): Promise<Db> {
    return (await this.getClient()).db(DB_NAME);
  }

  public async loadAuthorByEmail(email: string): Promise<StructuredAuthor> {
    const db = await this.getDb();
    const collection = db.collection(COLLECTIONS.AUTHORS);
    const dbResponse = await collection.findOne({ email });
    return dbResponse;
  }

  public async loadArticlesDates(): Promise<Array<any>> {
    const db = await this.getDb();
    const collection = db.collection(COLLECTIONS.ARTICLES);
    return await collection
      .aggregate([
        {
          $group: {
            _id: { $substr: ['$mesh_date', 0, 10] },
          },
        },
      ])
      .toArray();
  }

  public async loadArticlesByDate(date: string): Promise<Array<RawArticle>> {
    const db = await this.getDb();
    const collection = db.collection(COLLECTIONS.ARTICLES);
    return await collection
      .find({
        mesh_date: {
          $regex: `^${date}`,
        },
      })
      .toArray();
  }

  public async saveAuthor(author: StructuredAuthor) {
    const db = await this.getDb();
    const collection = db.collection(COLLECTIONS.AUTHORS);
    await collection.updateOne(
      { _id: author?._id },
      { $set: author },
      { upsert: true }
    );
  }

  public async findOne(collectionName: string, query: object) {
    const db = await this.getDb();
    const collection = db.collection(collectionName);
    return await collection.findOne(query);
  }

  public async updateOne(
    collectionName: string,
    query: object,
    payload: object
  ) {
    const db = await this.getDb();
    const collection = db.collection(collectionName);
    return await collection.updateOne(
      query,
      { $set: payload },
      { upsert: true }
    );
  }

  public async checkCollections() {
    await Promise.all(
      Object.values(COLLECTIONS).map(async (val) => {
        const db = await this.getDb();
        const cols = await db.collections();
        if (!cols.find((col) => col.collectionName === val)) {
          await db.createCollection(val);
        }
      })
    );
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.close(true);
      this.client = undefined;
    }
  }
}
