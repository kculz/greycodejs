const pluralize = (word) => {
    // List of common words that are already plural
    const alreadyPlural = ['children', 'people', 'men', 'women', 'data', 'series', 'species', 'deer', 'fish', 'sheep'];
  
    // Check if the word is already plural
    if (alreadyPlural.includes(word.toLowerCase())) {
      return word; // Return the original word if it is already plural
    }
  
    // Handle special cases
    const specialCases = {
      child: 'children',
      person: 'people',
      man: 'men',
      woman: 'women',
      mouse: 'mice',
      goose: 'geese',
      tooth: 'teeth',
      foot: 'feet',
      louse: 'lice',
      ox: 'oxen',
    };
  
    if (specialCases[word.toLowerCase()]) {
      return specialCases[word.toLowerCase()];
    }
  
    // General rules for pluralization
    if (word.endsWith('y') && !'aeiou'.includes(word[word.length - 2])) {
      // Ends in 'y' preceded by a consonant (e.g., baby -> babies)
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      // Ends in s, sh, ch, x, or z (e.g., bus -> buses, box -> boxes)
      return word + 'es';
    } else if (word.endsWith('f') || word.endsWith('fe')) {
      // Ends in 'f' or 'fe' (e.g., leaf -> leaves, knife -> knives)
      return word.replace(/f(e)?$/, 'ves');
    } else {
      // Default rule: add 's'
      return word + 's';
    }
  };
  
  module.exports = { pluralize };
  