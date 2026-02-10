// Minimal test harness for parseElsevier from Elsevier.html

function decodeLatexAccents(str) {
    if (!str) return "";
    const map = {
        "\\v{s}": "š", "\\v{S}": "Š",
        "\\v{c}": "č", "\\v{C}": "Č",
        "\\v{z}": "ž", "\\v{Z}": "Ž",
        "\\v{e}": "ě", "\\v{E}": "Ě",
        "\\v{n}": "ň", "\\v{N}": "Ň",
        "\\v{r}": "ř", "\\v{R}": "Ř",
        "\\v{t}": "ť", "\\v{T}": "Ť",
        "\\'{a}": "á", "\\'{A}": "Á",
        "\\'{e}": "é", "\\'{E}": "É",
        "\\'{i}": "í", "\\'{I}": "Í",
        "\\'{o}": "ó", "\\'{O}": "Ó",
        "\\'{u}": "ú", "\\'{U}": "Ú",
        "\\'{y}": "ý", "\\'{Y}": "Ý",
        "\\'a": "á", "\\'A": "Á",
        "\\'e": "é", "\\'E": "É",
        "\\'i": "í", "\\'I": "Í",
        "\\'o": "ó", "\\'O": "Ó",
        "\\'u": "ú", "\\'U": "Ú",
        "\\'y": "ý", "\\'Y": "Ý",
        "\\\\v{s}": "š", "\\\\v{S}": "Š",
        "\\\\'a": "á", "\\\\'A": "Á",
        "\\r{u}": "ů", "\\r{U}": "Ů",
        "\\\\r{u}": "ů", "\\\\r{U}": "Ů"
    };
    for (const key in map) {
        str = str.replaceAll(key, map[key]);
    }
    return str;
}

    function normalizeLatexNotation(s){
        if(!s) return s;
        s = s.replace(/([A-Za-z])'\\\{([A-Za-z])\\\}/g, "$1\\'{$2}");
        s = s.replace(/([A-Za-z])'([A-Za-z])/g, "$1\\'$2");
        return s;
    }

    function normalizePersonName(name){
        if(!name) return "";
        name = name.replace(/^\s*(Mr|Mrs|Ms|Dr|Prof)\.\s+/i, "");
        name = decodeLatexAccents(name);
        name = name.replace(/[^\p{L}\p{N}\s'-]/gu, '');
        name = name.replace(/\s+/g,' ').trim().toLowerCase();
        return name;
    }

function extractBalanced(str, startIndex) {
    let i = startIndex, depth = 1;
    while (i < str.length && depth > 0) {
        if (str[i] === "{") depth++;
        if (str[i] === "}") depth--;
        i++;
    }
    return str.slice(startIndex, i - 1);
}

function splitName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) return { first: "", last: parts[0] };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");
    return { first: firstName, last: lastName };
}

function parseAuthors(tex) {
    const authors = [];
    const correspondingIds = new Set();
    const cortextRegex = /\\cortext\[([^\]]+)\]/g;
    let corMatch;
    while ((corMatch = cortextRegex.exec(tex))) {
        correspondingIds.add(corMatch[1].trim());
    }
        let pos = 0;
        while (true) {
            const start = tex.indexOf("\\author[", pos);
            if (start === -1) break;
            const bracketStart = start + "\\author[".length;
            const bracketEnd = tex.indexOf("]", bracketStart);
            if (bracketEnd === -1) break;
            const refs = tex.slice(bracketStart, bracketEnd).split(',').map(x => x.trim()).filter(Boolean);
            const braceStart = tex.indexOf("{", bracketEnd) + 1;
            if (braceStart === 0) break;
            const block = extractBalanced(tex, braceStart);
            const fullName = decodeLatexAccents(block.replace(/\\corref\{[^}]*\}/g,'').trim());
            const nameParts = splitName(fullName);
            const cormarkIds = Array.from(block.matchAll(/\\cormark\[([^\]]+)\]/g)).map(x => x[1].trim());
            const correfIds = Array.from(block.matchAll(/\\corref\{([^}]+)\}/g)).map(x => x[1].trim());
            let isCorresponding = false;
            if (cormarkIds.some(id => correspondingIds.has(id))) isCorresponding = true;
            if (!isCorresponding && correfIds.some(id => correspondingIds.has(id))) isCorresponding = true;
            if (!isCorresponding) {
                isCorresponding = refs.some(ref => correspondingIds.has(ref) || ref.startsWith('cor'));
            }
            const affils = refs.filter(ref => /^\d+$/.test(ref));
            // try to find inline \email{...} immediately after block
            let email = "";
            const afterIdx = braceStart + block.length + 1;
            const afterSlice = tex.slice(afterIdx, afterIdx + 100);
            const ema = afterSlice.match(/\\email\{([^}]+)\}/);
            if (ema) email = ema[1].trim();
            authors.push({ firstName: nameParts.first, lastName: nameParts.last, email: email, affils, isCorresponding, fullName: fullName });
            pos = braceStart + block.length + 1;
        }
    const emailRegex = /\\ead\{([^}]+)\}/g;
    let emailIndex = 0; let emailMatch;
    while ((emailMatch = emailRegex.exec(tex)) && emailIndex < authors.length) {
        if (!authors[emailIndex].email) authors[emailIndex].email = emailMatch[1];
        emailIndex++;
    }
    return authors;
}

function extractAffils(tex) {
    const out = [];
    let pos = 0;
    while (true) {
        const slice = tex.slice(pos);
        const m = slice.match(/\\(?:address|affil(?:iation)?)\*?\[([^\]]+)\]/);
        if (!m) break;
        const start = pos + slice.indexOf(m[0]);
        const index = m[1].trim();
        const braceStart = tex.indexOf('{', start) + 1;
        if (braceStart === 0) break;
        const rawBlock = extractBalanced(tex, braceStart);
        const hasKV = /[a-zA-Z0-9_\-]+\s*=\s*\{/.test(rawBlock);
        out.push({ index, rawBlock, fullAddress: hasKV ? "" : decodeLatexAccents(rawBlock) });
        pos = braceStart + rawBlock.length + 1;
    }
    return out;
}

function parseAffiliationBlock(fullAddress) {
    if (fullAddress && fullAddress.includes("=")) {
        const kv = {};
        const kvRegex = /([a-zA-Z0-9_\-]+)\s*=\s*\{([\s\S]*?)\}/g;
        let m;
        while ((m = kvRegex.exec(fullAddress))) {
            kv[m[1].trim()] = decodeLatexAccents(m[2].trim());
        }
        return {
            fullAddress: Object.values(kv).join(", ") || "",
            org: kv.organization || kv.org || kv.orgname || "",
            country: kv.country || "",
            dep: kv.department || kv.dep || "",
            street: kv.addressline || kv.street || "",
            city: kv.city || "",
            postcode: kv.postcode || kv.zip || "",
            state: kv.state || ""
        };
    }
    const parts = (fullAddress || "").split(",").map(p => p.trim()).filter(Boolean);
    const country = parts.length > 0 ? parts[parts.length - 1] : "";
    const org = parts.length > 0 ? parts[0] : "";
    return { fullAddress: fullAddress || "", org, country, dep: "", street: "", city: "", postcode: "", state: "" };
}

function parseElsevier(tex) {
    const texAll = tex;
    function parseCommentMetadata_local(tx){
        const lines = tx.split(/\r?\n/);
        let headers = null;
        const map = {};
        for (const line of lines) {
            if (!line.trim().startsWith('%')) continue;
            const raw = line.trim().replace(/^%\s*/, '');
            if (!headers && /\bName\b/.test(raw) && /\bEmail\b/.test(raw) && /\bORCID\b/.test(raw)){
                headers = raw.split(/\t+/);
                continue;
            }
                const cols = raw.split(/\t+|\s+/);
                // find email and orcid positions heuristically
                const emailIdx = cols.findIndex(c => /@/.test(c));
                const orcidIdx = cols.findIndex(c => /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(c));
                if (emailIdx === -1) continue;
                const email = cols[emailIdx] || '';
                const orcid = orcidIdx !== -1 ? cols[orcidIdx] : '';
                // name is tokens before email (remove leading honorifics)
                const nameTokens = cols.slice(0, emailIdx);
                const nameRaw = nameTokens.join(' ').replace(/^\s*(Title|Mr|Mrs|Ms|Dr|Prof)\.?:?\s*/i, '').trim();
                if (!nameRaw) continue;
                map[normalizePersonName(nameRaw)] = { title: '', email, orcid, country: '' };
        }
        return map;
    }
    const texNoComments = tex.replace(/%.*/g, "");
    tex = texNoComments;
    let title = "";
    const titlePos = tex.indexOf("\\title{");
    if (titlePos !== -1) {
        const titleStart = tex.indexOf("{", titlePos) + 1;
        title = decodeLatexAccents(extractBalanced(tex, titleStart));
    }
    let abstract = "";
    const beginAbstractPos = tex.indexOf("\\begin{abstract}");
    if (beginAbstractPos !== -1) {
        const abstractStart = beginAbstractPos + "\\begin{abstract}".length;
        const abstractEnd = tex.indexOf("\\end{abstract}", abstractStart);
        if (abstractEnd !== -1) {
            abstract = tex.slice(abstractStart, abstractEnd).trim();
            if (abstract.startsWith("{}")) abstract = abstract.substring(2).trim();
            abstract = decodeLatexAccents(abstract);
        }
    } else {
        const abstractPos = tex.indexOf("\\abstract{");
        if (abstractPos !== -1) {
            const abstractStart = tex.indexOf("{", abstractPos) + 1;
            abstract = decodeLatexAccents(extractBalanced(tex, abstractStart));
        }
    }
    const authors = parseAuthors(tex);
    const rawAff = extractAffils(tex);
    const affils = rawAff.map(a => ({ index: a.index, ...parseAffiliationBlock(a.rawBlock || a.fullAddress) }));

    const metaByName = parseCommentMetadata_local(texAll);
    authors.forEach(a => {
        const key = (a.fullName || (a.firstName + ' ' + a.lastName)).trim();
        const meta = metaByName[normalizePersonName(key)];
        if (meta) {
            if (!a.email) a.email = meta.email || a.email;
            a.orcid = meta.orcid || a.orcid || '';
            a.country = meta.country || a.country || '';
        }
    });
    return { title, abstract, authors, affils };
}

// Sample LaTeX (from user)
const sample = `\\begin{frontmatter}
\\title{Towards Precision in Face Movement Evaluation: Introduction to Facial Symmetry Indicator}

\\author[1]{Alan Spark}
\\author[1]{Karel \\v{S}t\\'{i}cha}
\\author[1]{Jan Kohout}
\\author[2]{Ludmila Vere\\v{s}pejov\\'{a}}
\\author[2]{Martin Chovanec}
\\author[1,3]{Jan Mare\\v{s}}

% Title\tName\tEmail\tORCID\tCountry
% Mr. Alan Spark\talan.spark@vscht.cz\t0000-0002-5112-4842\tCzech Republic
% Mr. Karel Štícha\tkarel.sticha@vscht.cz\t0000-0003-0518-4702\tCzech Republic
% Mr. Jan Kohout\tjan.kohout@vscht.cz\t0000-0003-1591-2777\tCzech Republic
% Mrs. Ludmila Verešpejová\tludmila.verespejova@fnkv.cz\t0000-0001-6314-8000\tCzech Republic
% Mr. Martin Chovanec\tmartin.chovanec@fnkv.cz\t0000-0001-9087-0269\tCzech Republic
% Mr. Jan Mareš\tjan.mares@vscht.cz\t0000-0003-4693-2519\tCzech Republic

\\affiliation[1]{organization={Department of Mathematics, Informatics and Cybernetics, University of Chemistry and Technology Prague},
addressline={Technicka 1905/5},
city={Pardubice},
postcode={166 28},
country={Czech Republic}}
\\affiliation[2]{organization={Department of Otorhinolaryngology, University Hospital Kralovske Vinohrady, Charles University Prague, 3rd Faculty of Medicine},
addressline={Šrobárova 1150/50},
city={Pardubice},
postcode={100 34},
country={Czech Republic}}
\\affiliation[3]{organization={Faculty of Electrical Engineering and Informatics, University of Pardubice},
addressline={Nam. Cs. Legii 565},
city={Pardubice},
postcode={530 02},
country={Czech Republic}}
\\end{frontmatter}`;

const result = parseElsevier(sample);
console.log(JSON.stringify(result, null, 2));
