import { RawArticle } from '../entities/raw-article';
import { StructuredAuthor } from '../entities/structured-author';

import { StrategyQuality } from './strategy-quality';

export interface IStrategy {
  result: Array<StructuredAuthor>;
  quality: StrategyQuality;
  processRaw(article: RawArticle): boolean;
  printParsingQuality();
}
