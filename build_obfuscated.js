const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const rootDir = __dirname;

// Read clean source files from /src
const rawIndex = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const rawApp = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');
const rawCss = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');

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

// 2. FULL 100% Obfuscation of index.html (Entire Document Encoded)
const base64Index = Buffer.from(rawIndex).toString('base64');

const obfuscatedIndexContent = `<!--
====================================================================================
🈲 ANONMESH PROPRIETARY ENCRYPTED SOURCE CODE (CHINESE OBFUSCATION CIPHER v4.0)
====================================================================================
網頁全域加密系統：0x9F3F-FULL-DOM-PROTECTION
禁止複製、禁止檢查元素、禁止源代碼提取。任何未經授權的複製行為均被系統嚴格禁止。

𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜹𣜺𣜻𣜼𣜽𣜾𣜿𣝀𣝁𣝂𣝃𣝄𣝅𣝆𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐
𣝑𣝒𣝓𣝔𣝕𣝖𣝗𣝘𣝙𣝚𣝛𣝜𣝝𣝞𣝟𣝠𣝡𣝢𣝣𣝤𣝥𣝦𣝧𣝨𣝩𣝪𣝫𣝬𣝭𣝮𣝯𣝰𣝱𣝲𣝳𣝴𣝵𣝶𣝷
𣝸𣝹𣝺𣝻𣝼𣝽𣝾𣝿𣞀𣞁𣞂𣞃𣞄𣞅𣞆𣞇𣞈𣞉𣞊𣞋𣞌𣞍𣞎𣞏𣞐𣞑𣞒𣞓𣞔𣞕𣞖𣞗𣞘𣞙𣞚𣞛𣞜𣞝𣞞𣞟
====================================================================================
-->
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>AnonMesh</title>
</head>
<body oncontextmenu="return false;" onselectstart="return false;" ondragstart="return false;">
    <script>
        (function(_0x9f3f,_0x2e8b){
            const _0x51c2=function(_0x1a4f){while(--_0x1a4f){_0x9f3f['push'](_0x9f3f['shift']());}};
            _0x51c2(++_0x2e8b);
        }(['𫞂𣛵𣚚𣛲','𣜬𣜭𣜮𣜯','𣜰𣜱𣜲𣜳','𣜴𣜵𣜶𣜷','𣜸𣜹𣜺𣜻','𣜼𣜽𣜾𣜿'],0x19a));

        (function(){
            const _cipher = "${base64Index}";
            const _raw = atob(_cipher);
            document.open();
            document.write(_raw);
            document.close();
        })();
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(rootDir, 'index.html'), obfuscatedIndexContent, 'utf8');
console.log('✅ FULL 100% DOM & SCRIPT OBFUSCATION COMPLETE!');
