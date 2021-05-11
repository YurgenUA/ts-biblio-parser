export function extractEmails(text: string): Array<string> {
  const regex =
    '[^\\.\\s@:](?:[^\\s@:]*[^\\s@:\\.])?@[^\\.\\s@]+(?:\\.[^\\.\\s@]+)*';

  const matches = text?.match(new RegExp(regex, 'g'));
  return matches;
}
