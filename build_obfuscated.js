const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const rootDir = __dirname;

// Read clean source files from /src
const rawIndex = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const rawApp = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');

// 1. Obfuscate app.js into Base64 Chinese Cipher Evaluator
const base64App = Buffer.from(rawApp).toString('base64');
const obfuscatedAppContent = `/*
====================================================================================
🈲 ANONMESH PROPRIETARY ENCRYPTED APPLICATION SCRIPT (CHINESE OBFUSCATION CIPHER v4.0)
====================================================================================
網頁邏輯加密系統：0x9F3D-JS-PROTECTED-ENCRYPTION
禁止複製、禁止檢查腳本、禁止反編譯。任何未經授權的複製行為均被系統嚴格禁止。

𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜹𣜺𣜻𣜼𣜽𣜾𣜿𣝀𣝁𣝂𣝃𣝄𣝅𣝆𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐
𣝑𣝒𣝓𣝔𣝕𣝖𣝗𣝘𣝙𣝚𣝛𣝜𣝝𣝞𣝟𣝠𣝡𣝢𣝣𣝤𣝥𣝦𣝧𣝨𣝩𣝪𣝫𣝬𣝭𣝮𣝯𣝰𣝱𣝲𣝳𣝴𣝵𣝶𣝷
====================================================================================
*/
(function(_0x9f3d,_0x2e8b){
    const _0x51c2=function(_0x1a4f){while(--_0x1a4f){_0x9f3d['push'](_0x9f3d['shift']());}};
    _0x51c2(++_0x2e8b);
}(['𫞂𣛵𣚚𣛲','𣜬𣜭𣜮𣜯','𣜰𣜱𣜲𣜳','𣜴𣜵𣜶𣜷','𣜸𣜹𣜺𣜻','𣜼𣜽𣜾𣜿'],0x19a));

(function(){
    const _c = "${base64App}";
    const _d = atob(_c);
    const _s = document.createElement('script');
    _s.textContent = _d;
    document.head.appendChild(_s);
})();
`;

fs.writeFileSync(path.join(rootDir, 'app.js'), obfuscatedAppContent, 'utf8');

// 2. Obfuscate index.html so body DOM forms are rendered dynamically from encoded cipher
// Extract body content from rawIndex
const bodyMatch = rawIndex.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const bodyContent = bodyMatch ? bodyMatch[1] : '';
const headMatch = rawIndex.match(/<head[^>]*>([\s\S]*)<\/head>/i);
const headContent = headMatch ? headMatch[1] : '';

const base64Body = Buffer.from(bodyContent).toString('base64');

const obfuscatedIndexContent = `<!--
====================================================================================
🈲 ANONMESH PROPRIETARY ENCRYPTED SOURCE CODE (CHINESE OBFUSCATION CIPHER v4.0)
====================================================================================
網頁加密系統：0x9F3B-PROTECTED-ENCRYPTION-E2EE
禁止複製、禁止檢查元素、禁止源代碼提取。任何未經授權的複製行為均被系統嚴格禁止。

𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜹𣜺𣜻𣜼𣜽𣜾𣜿𣝀𣝁𣝂𣝃𣝄𣝅𣝆𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐
𣝑𣝒𣝓𣝔𣝕𣝖𣝗𣝘𣝙𣝚𣝛𣝜𣝝𣝞𣝟𣝠𣝡𣝢𣝣𣝤𣝥𣝦𣝧𣝨𣝩𣝪𣝫𣝬𣝭𣝮𣝯𣝰𣝱𣝲𣝳𣝴𣝵𣝶𣝷
𣝸𣝹𣝺𣝻𣝼𣝽𣝾𣝿𣞀𣞁𣞂𣞃𣞄𣞅𣞆𣞇𣞈𣞉𣞊𣞋𣞌𣞍𣞎𣞏𣞐𣞑𣞒𣞓𣞔𣞕𣞖𣞗𣞘𣞙𣞚𣞛𣞜𣞝𣞞𣞟
====================================================================================
-->
<!DOCTYPE html>
<html lang="de" data-theme="dark">
<head>
${headContent}
</head>
<body oncontextmenu="return false;" onselectstart="return false;" ondragstart="return false;">
    <script>
        (function(_0x9f3b,_0x2e8b){
            const _0x51c2=function(_0x1a4f){while(--_0x1a4f){_0x9f3b['push'](_0x9f3b['shift']());}};
            _0x51c2(++_0x2e8b);
        }(['𫞂𣛵𣚚𣛲','𣜬𣜭𣜮𣜯','𣜰𣜱𣜲𣜳','𣜴𣜵𣜶𣜷','𣜸𣜹𣜺𣜻','𣜼𣜽𣜾𣜿'],0x19a));

        (function(){
            const _b = "${base64Body}";
            const _h = atob(_b);
            const _div = document.createElement('div');
            _div.innerHTML = _h;
            while (_div.firstChild) {
                document.body.appendChild(_div.firstChild);
            }
        })();
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(rootDir, 'index.html'), obfuscatedIndexContent, 'utf8');
console.log('✅ Obfuscation complete! Both index.html and app.js are now Chinese-Cipher Obfuscated.');
