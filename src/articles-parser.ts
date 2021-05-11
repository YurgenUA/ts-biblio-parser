import { ObjectID } from 'bson';
import moment from 'moment';

import { StructuredAuthor } from './entities/structured-author';
import logger from './logger';
import MongoDbClient from './mongo-client';
import ParsingStats from './parsing-stats';
import { CrossAuthorsStrategy } from './strategies/cross-authors-strategy';
import { ElementaryStrategy } from './strategies/elementary-strategy';
import { IStrategy } from './strategies/i-strategy';
import { TerminatorStrategy } from './strategies/terminator-strategy';

type Class<T> = new (...args: any[]) => T;

const availableStrategies: Array<Class<IStrategy>> = [
  ElementaryStrategy,
  CrossAuthorsStrategy,
  TerminatorStrategy,
];

export default class ArticlesParser {
  dbClient: MongoDbClient;
  parsingStats: ParsingStats;
  processingDate: Date;

  constructor(dbClient: MongoDbClient) {
    this.dbClient = dbClient;
  }

  async init() {
    await this.dbClient.checkCollections();
    this.parsingStats = new ParsingStats(this.dbClient);
  }

  async hasAnythingToParse(): Promise<boolean> {
    const allTextedDates = await this.dbClient.loadArticlesDates();
    if (!allTextedDates || allTextedDates.length < 1) {
      logger.error('No data in process collection');
      return false;
    }
    const allDatesAsc = allTextedDates
      .map((it) => moment(it._id, 'YYYY/MM/DD'))
      .sort((a, b) => (a.isBefore(b) ? -1 : 1));
    const processedUntil: Date = await this.parsingStats.getLastProcesedDate();
    if (!processedUntil) {
      this.processingDate = allDatesAsc[0].toDate();
      return true;
    }
    const dateCandidate = allDatesAsc.find((it) => it.isAfter(processedUntil));
    if (dateCandidate) {
      this.processingDate = dateCandidate.toDate();
      return true;
    }

    logger.info(
      `All data up to "${processedUntil.toISOString()}" already parsed. Happy lazy day to you.`
    );
    return false;
  }

  async invokeParsing() {
    const records = await this.dbClient.loadArticlesByDate(
      moment(this.processingDate).format('YYYY/MM/DD')
    );
    logger.info(
      `found "${records.length}" articles dated "${this.processingDate}" to parse`
    );
    for (const record of records) {
      logger.info(`##### processing pubmed_id:${record.pubmed_id}`);
      try {
        let result: Array<StructuredAuthor>;
        // try parsing strategies one by one, until success result or talk terminator strategy positive response
        for (let i = 0; i < availableStrategies.length; i++) {
          const s: IStrategy = new availableStrategies[i]();
          logger.info(`Trying strategy "${s.constructor.name}" ...`);
          if (s.processRaw(record)) {
            logger.info(
              `Strategy "${s.constructor.name}" claimed publication to be parsed`
            );
            result = s.result;
            s.printParsingQuality();
            break;
          }
        }
        if (result.length > 0) {
          // find stored result in Author and upsert
          await this.storeArticleAuthors(record.pubmed_id, result);
        }
      } catch (e) {
        logger.error('processing exception occurred:', e);
        logger.info('failed record piece:', { authors: record.authors });
      }
      logger.info('##### end of processing');
    }
  }

  async storeArticleAuthors(
    pubMedId: string,
    matches: Array<StructuredAuthor>
  ): Promise<void> {
    if (matches.length === 0) {
      return;
    }
    logger.info(
      `\tStoring matched '${matches.length}' author(s) for publication '${pubMedId}'`
    );
    const storedAuthors = await Promise.all(
      matches.map(
        async (match) => await this.dbClient.loadAuthorByEmail(match.email)
      )
    );
    let index = 0;
    for (const match of matches) {
      const storedAuthor = storedAuthors[index++];
      if (!storedAuthor) {
        // save new Author
        match.articles = [pubMedId];
        match._id = new ObjectID();
        await this.dbClient.saveAuthor(match);
      } else {
        // Author saved in MongoDB => update article_id
        if (storedAuthor.articles.find((it) => it === pubMedId)) {
          // Article is already referenced => no need to update
          continue;
        }
        storedAuthor.articles.push(pubMedId);
        await this.dbClient.saveAuthor(storedAuthor);
      }
    }
  }

  async updateParsedStats() {
    await this.parsingStats.saveLastProcesedDate(this.processingDate);
  }
}
