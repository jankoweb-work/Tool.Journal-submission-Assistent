```javascript
javascript:(function(){try{const laTexCode=prompt('Paste your Springer LaTeX content:');if(!laTexCode||laTexCode.trim()===''){alert('No content provided.');return;}function decodeLatexAccents(str){if(!str)return'';const map={'\\v{s}':'š','\\v{S}':'Š','\\v{c}':'č','\\v{C}':'Č','\\v{z}':'ž','\\v{Z}':'Ž','\\v{e}':'ě','\\v{E}':'Ě','\\v{n}':'ň','\\v{N}':'Ň','\\v{r}':'ř','\\v{R}':'Ř','\\v{t}':'ť','\\v{T}':'Ť','\\\'{a}':'á','\\\'{A}':'Á','\\\'{e}':'é','\\\'{E}':'É','\\\'{i}':'í','\\\'{I}':'Í','\\\'{o}':'ó','\\\'{O}':'Ó','\\\'{u}':'ú','\\\'{U}':'Ú','\\\'{y}':'ý','\\\'{Y}':'Ý','\\r{u}':'ů','\\r{U}':'Ů'};for(const key in map){str=str.replaceAll(key,map[key]);}return str;}function extractBalanced(str,startIndex){let i=startIndex,depth=1;while(i<str.length&&depth>0){if(str[i]==='{')depth++;if(str[i]==='}')depth--;i++;}return str.slice(startIndex,i-1);}function extractFirstName(block){const pos=block.indexOf('\\fnm{');if(pos===-1)return'';const start=block.indexOf('{',pos)+1;return decodeLatexAccents(extractBalanced(block,start));}function extractSurname(block){const pos=block.indexOf('\\sur{');if(pos===-1)return'';const start=block.indexOf('{',pos)+1;return decodeLatexAccents(extractBalanced(block,start));}

function parseAuthors(tex){
    const authors = [];
    // support \author[1]{Name} with optional \email{...}
    const regex = /\\author\*?\[([^\]]+)\]\{([\s\S]*?)\}(?:\\email\{([^}]*)\})?/g;
    let m;
    while((m = regex.exec(tex))){
        const affils = m[1].split(',').map(x => x.trim()).filter(Boolean);
        const block = m[2].trim();
        const email = m[3] ? m[3].trim() : '';
        let fn = extractFirstName(block);
        let sn = extractSurname(block);
        if(!fn && !sn){
            const decoded = decodeLatexAccents(block.replace(/\\corref\{[^}]*\}/g,'').trim());
            const parts = decoded.split(/\s+/);
            if(parts.length===1){ fn = parts[0]; sn = ''; }
            else { sn = parts.pop(); fn = parts.join(' '); }
        }
        const isCorresponding = block.includes('\\corref') || m[0].includes('\\author*');
        authors.push({firstName:fn,lastName:sn,email,affils,isCorresponding});
    }
    return authors;
}

function extractAffils(tex){
    const out = [];
    let pos = 0;
    // support both \affil[...] and \affiliation[...] forms
    while(true){
        const nextAffil = tex.slice(pos).search(/\\affil(?:iation)?\*?\[/);
        if(nextAffil === -1) break;
        const start = pos + nextAffil;
        const idx = tex.slice(start).match(/\\affil(?:iation)?\*?\[([^\]]+)\]/);
        if(!idx) break;
        const index = idx[1].trim();
        const braceStart = tex.indexOf('{', start) + 1;
        if(braceStart===0) break;
        const block = extractBalanced(tex, braceStart);
        out.push({index,block});
        pos = braceStart + block.length;
    }
    return out;
}

function parseAffiliationBlock(block){
    // try to parse key={value} pairs like organization={...}
    const kv = {};
    const kvRegex = /([a-zA-Z0-9_\-]+)\s*=\s*\{([\s\S]*?)\}/g;
    let m;
    while((m = kvRegex.exec(block))){
        kv[m[1].trim()] = decodeLatexAccents(m[2].trim());
    }
    if(Object.keys(kv).length>0){
        return {
            organization: kv.organization || kv.org || kv.orgname || kv.department || kv.dep || '',
            addressline: kv.addressline || kv.street || kv.addr || '',
            city: kv.city || '',
            postcode: kv.postcode || kv.zip || '',
            state: kv.state || '',
            country: kv.country || ''
        };
    }
    function get(cmd){
        const re = new RegExp('\\\\'+cmd+'\\{([^}]*)\\}');
        const mm = block.match(re);
        return mm?decodeLatexAccents(mm[1].trim()):'';
    }
    return {
        organization: get('orgname') || get('org') || get('organization') || get('orgdiv'),
        addressline: get('street') || get('addressline'),
        city: get('city'),
        postcode: get('postcode'),
        state: get('state'),
        country: get('country')
    };
}

function parseSpringer(tex){tex=tex.replace(/%.*/g,'');let title='';const titlePos=tex.indexOf('\\title{');if(titlePos!==-1){const titleStart=tex.indexOf('{',titlePos)+1;title=extractBalanced(tex,titleStart);}let abstract='';const beginAbstractPos=tex.indexOf('\\begin{abstract}');if(beginAbstractPos!==-1){const abstractStart=beginAbstractPos+'\\begin{abstract}'.length;const abstractEnd=tex.indexOf('\\end{abstract}',abstractStart);if(abstractEnd!==-1){abstract=tex.slice(abstractStart,abstractEnd).trim();if(abstract.startsWith('{}'))abstract=abstract.substring(2);}}else{const abstractPos=tex.indexOf('\\abstract{');if(abstractPos!==-1){const abstractStart=tex.indexOf('{',abstractPos)+1;abstract=extractBalanced(tex,abstractStart);}}const authors=parseAuthors(tex);const rawAff=extractAffils(tex);const affils=rawAff.map(a=>({index:a.index,...parseAffiliationBlock(a.block)}));return{title,abstract,authors,affils};}const data=parseSpringer(laTexCode);function setInputValue(selector,value){const input=document.querySelector(selector);if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}}const titleInputs=Array.from(document.querySelectorAll('input[type="text"]')).filter(inp=>inp.placeholder&&inp.placeholder.includes('Title'));if(titleInputs.length>0){setInputValue('input[placeholder*="Title"]',data.title);}const abstractInputs=Array.from(document.querySelectorAll('textarea')).filter(ta=>ta.placeholder&&ta.placeholder.includes('abstract'));if(abstractInputs.length>0){const abstractArea=abstractInputs[0];abstractArea.value=data.abstract;abstractArea.dispatchEvent(new Event('input',{bubbles:true}));}data.authors.forEach((author,idx)=>{const authorSection=document.querySelector(`[data-author-index="${idx}"]`);if(authorSection){const details=authorSection.querySelector('details');if(details&&!details.open){details.open=true;}const givenNameInputs=authorSection.querySelectorAll('input[type="text"]');if(givenNameInputs.length>0){givenNameInputs[0].value=author.firstName;givenNameInputs[0].dispatchEvent(new Event('input',{bubbles:true}));}if(givenNameInputs.length>1){givenNameInputs[1].value=author.lastName;givenNameInputs[1].dispatchEvent(new Event('input',{bubbles:true}));}const emailInputs=authorSection.querySelectorAll('input[type="email"]');if(emailInputs.length>0){emailInputs[0].value=author.email;emailInputs[0].dispatchEvent(new Event('input',{bubbles:true}));}if(author.affils.length>0){const affSelect=authorSection.querySelector('select');if(affSelect&&data.affils[author.affils[0]-1]){const affOrg=data.affils[author.affils[0]-1].org;const option=Array.from(affSelect.options).find(opt=>opt.text.includes(affOrg));if(option){affSelect.value=option.value;affSelect.dispatchEvent(new Event('change',{bubbles:true}));}}}}}});alert('✓ Form pre-filled!\\n\\nReview all fields and adjust as needed.');}catch(e){alert('Error: '+e.message);}})();
```