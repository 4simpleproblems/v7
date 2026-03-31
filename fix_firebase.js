const fs = require('fs');

const filesToFix = [
    'index.html',
    '404.html',
    'verify.html',
    'logged-in/vern.html',
    'logged-in/velium.html',
    'logged-in/games.html',
    'logged-in/teaser.html',
    'logged-in/soundboard.html',
    'navigation-mini.js',
    'navigation-test.js'
];

filesToFix.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove Firebase imports/script tags
        content = content.replace(/<script[^>]*firebase[^>]*><\/script>\n?/g, '');
        content = content.replace(/import.*firebase.*['"];?\n?/g, '');
        
        // Replace initializeApp logic with simple window.supabase usage (if not already handled)
        content = content.replace(/const app = initializeApp\(firebaseConfig\);/g, '');
        content = content.replace(/import \{ firebaseConfig \} from .*firebase-config.js['"];?/g, '');
        
        // More custom replacements could go here, but this is a start.
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});
