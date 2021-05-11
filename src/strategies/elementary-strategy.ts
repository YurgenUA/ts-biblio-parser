import { RawArticle } from '../entities/raw-article';
import logger from '../logger';

import { extractEmails } from './etc';
import { IStrategy } from './i-strategy';
import { StrategyQuality } from './strategy-quality';

export class ElementaryStrategy implements IStrategy {
  article: RawArticle;
  result = [];
  quality = new StrategyQuality();
  processRaw(article: RawArticle) {
    this.article = article;
    article.authors.forEach((author) => {
      const emails = extractEmails(author.affiliation);
      if (!emails) {
        //no emails -> skipping
        return;
      }
      this.quality.foundEmails += emails.length;
      const names = ElementaryStrategy.extractName(author.full_author);
      if (!names.name1 && !names.name2) {
        //no names -> skipping
        return;
      }
      logger.info('\textracted', { emails, names });

      //if any name part is in email -> match
      const matchedEmail = emails.find(
        (email) =>
          //TODO: metch should be long enough (two characters is not enough)
          email.toLowerCase().includes(names.name1.toLowerCase()) ||
          email.toLowerCase().includes(names.name2.toLowerCase())
      );
      if (matchedEmail) {
        this.result.push({
          name1: names.name1,
          name2: names.name1,
          email: matchedEmail,
        });
        this.quality.matchedEmailToAuthors += 1;
      }
    });

    // TODO: decide on success based on accuracy stats
    return this.quality.matchedEmailToAuthors > 0;
  }

  /// Author's name parts are comma separated and trimmed
  static extractName(fullName: string): { name1: string; name2: string } {
    const pieces = fullName.split(',');
    return {
      name1: pieces[0].trim(),
      name2: pieces.length > 1 ? pieces[1].trim() : null,
    };
  }

  printParsingQuality() {
    this.quality.print(this.article);
  }
}
