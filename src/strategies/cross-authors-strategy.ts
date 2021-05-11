import * as _ from 'lodash';

import { RawArticle } from '../entities/raw-article';
import logger from '../logger';

import { extractEmails } from './etc';
import { IStrategy } from './i-strategy';
import { StrategyQuality } from './strategy-quality';

export class CrossAuthorsStrategy implements IStrategy {
  article: RawArticle;
  result = [];
  quality = new StrategyQuality();
  processRaw(article: RawArticle) {
    this.article = article;
    const emails = [];
    const names: Array<{ name1: string; name2 }> = [];
    // handle emails and names from whole article together
    article.authors.forEach((author) => {
      emails.push(...(extractEmails(author.affiliation) || []));
      names.push(...CrossAuthorsStrategy.extractName(author.full_author));
    });
    if (!emails) {
      //no emails -> skipping
      return false;
    }
    this.quality.foundEmails += emails.length;
    logger.info('\textracted', { emails, names });

    //if any name part is in email -> match
    emails.forEach((email) => {
      //TODO: metch should be long enough (two characters is not enough)
      const matchedName = names.find(
        (name) =>
          email.toLowerCase().includes(name.name1.toLowerCase()) ||
          email.toLowerCase().includes(name.name2.toLowerCase())
      );
      if (matchedName) {
        this.result.push({
          name1: matchedName.name1,
          name2: matchedName.name1,
          email,
        });
        this.quality.matchedEmailToAuthors += 1;
      }
    });

    // TODO: decide on success based on accuracy stats
    return this.quality.matchedEmailToAuthors > 0;
  }

  /// Author's name parts are comma separated and trimmed
  // "Bushel, Pierre R"
  static extractName(
    fullName: string
  ): Array<{ name1: string; name2: string }> {
    const result = [];
    const pieces = fullName.split(',');
    const name1 = pieces[0].trim();
    const name2 = pieces.length > 1 ? pieces[1].trim() : null;

    // add trivial split result
    result.push({ name1, name2 });
    // if any part has extra suffix ("Bushel, Pierre R") => add "PierreR" and "Pierre" as possible name
    const checkCompositePart = function (
      nameUnderCheck: string,
      otherName: string
    ) {
      const words: Array<string> = _.words(nameUnderCheck);
      if (words.length < 2) {
        return;
      }
      // add "PierreR"
      result.push({ name1: words.join(''), name2: otherName });
      // add "Pierre"
      result.push({
        name1: words.sort((a, b) => a.length - b.length).pop(),
        name2: otherName,
      });
    };
    checkCompositePart(name1, name2);
    checkCompositePart(name2, name1);
    return result;
  }

  printParsingQuality() {
    this.quality.print(this.article);
  }
}
