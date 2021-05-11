import logger from './logger';
import MongoDbClient, { COLLECTIONS } from './mongo-client';

const LAST_PROCESSED_DATE = 'last_processed_date';

export default class ParsingStats {
  private dbClient: MongoDbClient;

  constructor(dbclient: MongoDbClient) {
    this.dbClient = dbclient;
  }

  async getLastProcesedDate(): Promise<Date> {
    const storedDate = await this.dbClient.findOne(COLLECTIONS.STATS, {
      key: LAST_PROCESSED_DATE,
    });
    return storedDate?.value;
  }

  async saveLastProcesedDate(date: Date): Promise<void> {
    const storedDate = await this.dbClient.updateOne(
      COLLECTIONS.STATS,
      { key: LAST_PROCESSED_DATE },
      { value: date }
    );
    logger.info('saver stat response', storedDate);
  }
}
