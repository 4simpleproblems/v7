/**
 * Profanity Filter Utility
 * Uses the profanity.dev API to check for inappropriate content.
 */

export async function checkProfanity(text) {
    if (!text || text.trim().length === 0) return false;

    try {
        const response = await fetch('https://vector.profanity.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });

        if (!response.ok) {
            console.warn("Profanity API responded with error:", response.status);
            return false; // Fail open to avoid blocking users on API issues
        }

        const data = await response.json();
        return data.isProfanity === true;
    } catch (err) {
        console.error("Profanity check failed:", err);
        return false; // Fail open
    }
}

// Made with ❤️ from 4SP
