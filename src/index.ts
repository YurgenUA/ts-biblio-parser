import dotenv from 'dotenv';

dotenv.config();
import ArticlesParser from './articles-parser';
import logger from './logger';
import MongoDbClient from './mongo-client';

export async function main() {
  logger.info('starting main()...');
  const mongo = new MongoDbClient();
  const articleParser = new ArticlesParser(mongo);
  try {
    await articleParser.init();
    if (!(await articleParser.hasAnythingToParse())) {
      logger.info('There are nothing new to prase in input collection.');
      return;
    }
    logger.info(
      `====== going to process data for "${articleParser.processingDate}" ====`
    );
    await articleParser.invokeParsing();

    await articleParser.updateParsedStats();
  } finally {
    mongo.destroy();
  }
}
