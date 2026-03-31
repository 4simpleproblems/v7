const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'navigation-mini.js',
    'navigation-test.js',
    '404.html',
    'verify.html',
    'logged-in/settings.html',
    'logged-in/teaser.html',
    'logged-in/securly-tester.html',
    'logged-in/profile.html',
    'logged-in/test.js'
];

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove Firebase scripts
    content = content.replace(/<script[^>]*src="https:\/\/www\.gstatic\.com\/firebasejs[^>]*><\/script>\n?/g, '');
    
    // Remove firebaseConfig imports
    content = content.replace(/import\s+\{\s*firebaseConfig\s*\}\s+from\s+['"][^'"]+firebase-config\.js['"];\n?/g, '');
    content = content.replace(/import\s+\{\s*firebaseConfig2\s*\}\s+from\s+['"][^'"]+firebase-config-2\.js['"];\n?/g, '');
    content = content.replace(/<script[^>]*src="[^"]*firebase-config\.js"[^>]*><\/script>\n?/g, '');
    
    // Replace Firebase initialization with Supabase
    content = content.replace(/import.*firebase.*['"];\n?/g, '');
    content = content.replace(/const app = initializeApp\(firebaseConfig\);\n?/g, '');
    content = content.replace(/const app2 = initializeApp\(firebaseConfig2, "secondary"\);\n?/g, '');
    content = content.replace(/if \(!getApps\(\)\.length\) initializeApp\(firebaseConfig\);\n?/g, '');
    
    // Convert basic Auth checks
    content = content.replace(/firebase\.auth\(\)\.onAuthStateChanged/g, 'window.supabase.auth.onAuthStateChange');
    content = content.replace(/getAuth\(\)\.onAuthStateChanged/g, 'window.supabase.auth.onAuthStateChange');
    content = content.replace(/auth\.currentUser/g, '(await window.supabase.auth.getSession()).data.session?.user');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${filePath}`);
}

filesToProcess.forEach(processFile);
