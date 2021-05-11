import { RawArticle } from '../entities/raw-article';

import logger from './../logger';
import { IStrategy } from './i-strategy';

export class TerminatorStrategy implements IStrategy {
  article: RawArticle;
  result = [];
  quality: undefined;
  processRaw(article: RawArticle) {
    this.article = article;
    return true;
  }

  printParsingQuality() {
    logger.info('\t---- failed to parse :(');
    if (this.article) {
      logger.info(`\tarticle: ${JSON.stringify(this.article, undefined, 2)}`);
    }
  }
}
