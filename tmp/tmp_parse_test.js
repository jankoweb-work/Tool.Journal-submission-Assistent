const extractBalanced = (s, i) => {
    let depth = 1;
    let j = i;
    while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++;
        if (s[j] === '}') depth--;
        j++;
    }
    return s.slice(i, j - 1);
};

const decode = (str) => {
    return str
        .replaceAll('\\v{s}', 'š')
        .replaceAll('\\v{S}', 'Š')
        .replaceAll("\\'{a}", 'á')
        .replaceAll("\\'a", 'á')
        .replaceAll("\\\\v{s}", 'š')
        .replaceAll("\\\\'{a}", 'á');
};

const tex = "\\author[2]{Ludmila Vere\\v{s}pejov\\'{a}}";
const start = tex.indexOf('\\author[');
const bracketStart = start + '\\author['.length;
const bracketEnd = tex.indexOf(']', bracketStart);
const refs = tex.slice(bracketStart, bracketEnd).split(',').map(x => x.trim());
const braceStart = tex.indexOf('{', bracketEnd) + 1;
const block = extractBalanced(tex, braceStart);
console.log('refs=', refs);
console.log('blockRaw=', block);
console.log('decoded=', decode(block));
