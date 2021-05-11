import { RawArticle } from '../entities/raw-article';

import logger from './../logger';

export class StrategyQuality {
  foundEmails = 0;
  matchedEmailToAuthors = 0;

  get accuracy(): string {
    return `${((this.matchedEmailToAuthors * 100) / this.foundEmails).toFixed(
      2
    )}%`;
  }
  print(article: RawArticle = null) {
    logger.info(`\t---- parse quality: accuracy:${this.accuracy}`);
    logger.info(
      `\tfoundEmails:${this.foundEmails}\tmatchedEmails:${this.matchedEmailToAuthors}`
    );
    if (article) {
      logger.info(
        `\tarticle: ${JSON.stringify(article.authors, undefined, 2)}`
      );
    }
  }
}
