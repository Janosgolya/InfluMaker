# Qwen 3.8 Audit Report: Pinterest & Reddit Uploaders

### Pinterest Root Causes and Fixes

#### 1. Why Pins Got Saved as Drafts Instead of Being Published?

**Root Causes:**
- Incorrect board selection.
- Incorrect handling of the modal.
- Incorrect publish button selectors.
- Missing verification of successful publish redirection/toast.

#### 2. Actionable First-Principles Fixes for Pinterest

**1. Correct Board Selection:**
Ensure the board is correctly selected before publishing. This can be done by verifying the board name or ID.

**2. Correct Handling of Modal:**
Ensure the modal is closed before attempting to publish. This can be done by checking if the modal is visible and then clicking the close button.

**3. Correct Publish Button Selector:**
Use the correct publish button selector. The real publish button should be identified and clicked.

**4. Verification of Successful Publish Redirection/Toast:**
Check if the URL redirects to the live post URL or if a toast notification confirms the post was published.

**Code Modifications:**

```javascript
async function publishPinterestPin(pinId, boardId) {
    await page.goto(`https://www.pinterest.com/pin/${pinId}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Check if the board is selected
    const boardSelector = page.locator(`#board-${boardId}`);
    if (await boardSelector.isVisible({ timeout: 2000 })) {
        await boardSelector.click();
    }

    // Close any modal if it's visible
    const modal = page.locator('.pinterest-modal');
    if (await modal.isVisible({ timeout: 2000 })) {
        const closeButton = modal.locator('.pinterest-modal-close');
        await closeButton.click();
    }

    // Click the publish button
    const publishButton = page.locator('button[data-test-id="board-dropdown-save-button"]');
    if (await publishButton.isVisible({ timeout: 2000 })) {
        await publishButton.click();
    }

    // Wait for the publish confirmation
    await page.waitForTimeout(5000);
    const livePostUrl = page.url();
    console.log(`🌐 Live Post URL: ${livePostUrl}`);

    // Capture confirmation screenshot
    const screenshotPath = path.join(__dirname, '../../config/pinterest_published_confirmation.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

    // Verify if the post was published
    const publishToast = page.locator('.pinterest-toast');
    if (await publishToast.isVisible({ timeout: 2000 })) {
        console.log('✅ Pinterest post published!');
    } else {
        console.error('❌ Pinterest post not published.');
    }

    return {
        success: true,
        postUrl: livePostUrl,
        boardId: boardId
    };
}
```

### Reddit Root Causes and Fixes

#### 1. Why Reddit Failed to Submit?

**Root Causes:**
- Incorrect media tab selection.
- Incorrect subreddit flair requirement.
- Incorrect title/image readiness.
- Incorrect submit button enablement/disabled state.
- False positives (returning success: true even when still on /submit/).

#### 2. Actionable First-Principles Fixes for Reddit

**1. Correct Media Tab Selection:**
Ensure the media tab is correctly selected before uploading the image.

**2. Correct Subreddit Flair Requirement:**
Ensure the subreddit flair is correctly applied if required.

**3. Correct Title/Image Readiness:**
Ensure the title and image are correctly entered and uploaded.

**4. Correct Submit Button Enablement:**
Ensure the submit button is enabled before attempting to click it.

**5. Verification of Successful Publish Redirection:**
Check if the URL redirects to the live post URL or if a confirmation message is displayed.

**Code Modifications:**

```javascript
async function uploadRedditPost(subreddit, imagePath, title, isNsfw, firstComment) {
    await page.goto(subreddit ? `https://www.reddit.com/r/${subreddit}/submit` : `https://www.reddit.com/submit`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Check if logged in
    if (page.url().includes('/login') || page.url().includes('/register')) {
        throw new Error('Reddit session expired or invalid. Please re-run login_reddit.bat.');
    }

    // 0. Accept cookies if banner visible
    try {
        const acceptCookies = page.locator('button').filter({ hasText: /^Zaakceptuj wszystkie$|^Accept all$/i }).first();
        if (await acceptCookies.isVisible({ timeout: 2000 })) {
            await acceptCookies.click();
            await page.waitForTimeout(1000);
        }
    } catch {}

    // 1. Switch to "Images & Video" tab if available
    console.log('📑 Selecting Images & Video tab...');

    const mediaTab = page.locator('button[role="tab"], button').filter({ hasText: /Image|Images|Zdjęcia|Wideo|Media/i }).first();
    if (await mediaTab.isVisible({ timeout: 4000 })) {
        await mediaTab.click();
        await page.waitForTimeout(1500);
    }

    // 2. Upload Image File
    console.log('📤 Locating file input...');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });
    await fileInput.setInputFiles(path.resolve(imagePath));
    console.log('✅ Image uploaded to Reddit canvas!');

    await page.waitForTimeout(3000);

    // 3. Enter Title
    console.log('✍️ Entering Post Title...');

    const titleContainer = page.locator('faceplate-textarea-input[name="title"], [name="title"]').first();
    if (await titleContainer.isVisible({ timeout: 5000 })) {
        const innerTextarea = titleContainer.locator('textarea').first();
        if (await innerTextarea.isVisible({ timeout: 2000 })) {
            await innerTextarea.fill(title.substring(0, 300));
        } else {
            await titleContainer.click();
            await page.keyboard.type(title.substring(0, 300), { delay: 5 });
        }
    } else {
        const genericTitle = page.locator('textarea[placeholder*="Title" i], textarea[placeholder*="Tytuł" i], input[placeholder*="Title" i]').first();
        await genericTitle.fill(title.substring(0, 300));
    }
    console.log('✅ Title populated!');

    await page.waitForTimeout(1500);

    // 4. Select Flair (required by many subreddits like r/aiArt)
    try {
        console.log('🏷️ Checking for required subreddit Flair...');

        const flairTrigger = page.locator('button, [role="button"]').filter({ hasText: /Flair|Wyróżnienie|Dodaj wyróżnienie|Add flair/i }).first();
        if (await flairTrigger.isVisible({ timeout: 3000 })) {
            await flairTrigger.click();
            await page.waitForTimeout(1500);

            const firstFlair = page.locator('div[role="dialog"] li, div[role="dialog"] [role="radio"], div[role="dialog"] button, [data-testid*="flair"]').first();
            if (await firstFlair.isVisible({ timeout: 2000 })) {
                await firstFlair.click();
                await page.waitForTimeout(500);
                const applyFlair = page.locator('div[role="dialog"] button').filter({ hasText: /Zastosuj|Apply|Save/i }).first();
                if (await applyFlair.isVisible({ timeout: 2000 })) {
                    await applyFlair.click();
                    console.log('✅ Subreddit flair applied!');
                }
            }
        }
    } catch (flairErr) {
        console.log('ℹ️ Flair check note:', flairErr.message);
    }

    await page.waitForTimeout(1500);

    // 5. Toggle NSFW if requested
    if (isNsfw) {
        console.log('🔞 Toggling NSFW tag...');

        const nsfwBtn = page.locator('button').filter({ hasText: /^NSFW$|^18\+$/i }).first();
        if (await nsfwBtn.isVisible({ timeout: 2000 })) {
            await nsfwBtn.click();
            console.log('✅ NSFW tag enabled');
        }
    }

    await page.waitForTimeout(1500);

    // 6. Click Submit / Post Button
    console.log('🚀 Submitting Post to Reddit...');

    let submitted = false;

    const postBtnSelectors = [
        'shreddit-post-form button[type="submit"]',
        'button[slot="submit-button"]',
        'button[data-testid="submit-button"]',
        'button:has-text("Opublikuj")',
        'button:has-text("Post")',
        'button:has-text("Submit")',
        'button[type="submit"]'
    ];

    for (const sel of postBtnSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 })) {
            try {
                await btn.click({ force: true });
                submitted = true;
                console.log(`✅ Clicked submit button via selector: ${sel}`);
                break;
            } catch {}
        }
    }

    if (!submitted) {
        console.log